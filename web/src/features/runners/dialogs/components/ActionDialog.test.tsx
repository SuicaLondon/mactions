import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';

import type { Runner } from '../../../../shared/api/types';
import { ActionDialog } from './ActionDialog';

const runner = {
  id: 7,
  name: 'build-mac',
  labels: ['build'],
  github_labels: null,
} as unknown as Runner;

function renderDialog(props: Partial<Parameters<typeof ActionDialog>[0]> = {}) {
  const onClose = vi.fn();
  const onRun = vi.fn();
  const view = render(
    <ActionDialog
      runner={runner}
      action="retry"
      locked={false}
      onClose={onClose}
      onRun={onRun}
      {...props}
    />,
  );
  return { ...view, onClose, onRun };
}

it('submits the typed token and keeps it while the operation is pending', async () => {
  const user = userEvent.setup();
  const { onRun, rerender, onClose } = renderDialog();
  const token = screen.getByLabelText('Registration token (optional)');
  await user.type(token, 'secret-token');
  await user.click(screen.getByRole('button', { name: 'Retry' }));
  expect(onRun).toHaveBeenCalledWith({
    path: '/api/runners/7/retry',
    payload: { registration_token: 'secret-token' },
    message: 'Resuming setup for build-mac…',
    success: 'build-mac setup resumed.',
  });

  rerender(
    <ActionDialog runner={runner} action="retry" locked pending onClose={onClose} onRun={onRun} />,
  );
  const submit = screen.getByRole('button', { name: 'Retry' });
  expect(submit).toHaveAttribute('aria-busy', 'true');
  expect(submit).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  expect(token).toHaveValue('secret-token');
  await user.click(submit);
  expect(onRun).toHaveBeenCalledTimes(1);
});

it('shows a failure inside the dialog and keeps the entries for another attempt', async () => {
  const user = userEvent.setup();
  const { onRun } = renderDialog({ action: 'labels', error: 'GitHub rejected the labels.' });
  expect(screen.getByRole('alert')).toHaveTextContent('GitHub rejected the labels.');
  expect(screen.getByRole('alert')).toHaveTextContent('Your entries are kept.');
  const input = screen.getByRole('textbox', { name: 'Custom labels' });
  await user.clear(input);
  await user.type(input, 'release');
  await user.click(screen.getByRole('button', { name: 'Save labels' }));
  expect(onRun).toHaveBeenCalledWith(expect.objectContaining({ payload: { labels: ['release'] } }));
});
