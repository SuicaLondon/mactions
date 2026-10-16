import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';

import { UpdateFailedIndicator } from './UpdateFailedIndicator';

it('reserves its space invisibly when there is no error', () => {
  render(<UpdateFailedIndicator error={null} onRetry={vi.fn()} />);
  const status = screen.getByText('Update failed').closest('[role="status"]');
  expect(status).toHaveAttribute('aria-hidden', 'true');
});

it('keeps Retry inline and opens a popover with the full message', async () => {
  const onRetry = vi.fn();
  render(<UpdateFailedIndicator error={new Error('Rate limit exceeded.')} onRetry={onRetry} />);
  const status = screen.getByRole('status');
  expect(status).toHaveAttribute('title', 'Rate limit exceeded.');
  expect(within(status).getAllByRole('button', { name: 'Retry', hidden: true })).toHaveLength(1);
  const trigger = screen.getByRole('button', { name: 'Update failed' });
  const popover = document.getElementById(trigger.getAttribute('popovertarget') ?? '');
  // jsdom applies the closed popover style but does not implement popovertarget toggling.
  expect(popover).toHaveAttribute('popover', 'auto');
  expect(popover).not.toBeVisible();
  expect(popover).toHaveTextContent('Rate limit exceeded.');
  expect(within(popover as HTMLElement).queryByRole('button', { hidden: true })).toBeNull();
  const retry = within(status).getByRole('button', { name: 'Retry' });
  expect(retry).toBeVisible();
  await userEvent.click(retry);
  expect(onRetry).toHaveBeenCalledOnce();
});
