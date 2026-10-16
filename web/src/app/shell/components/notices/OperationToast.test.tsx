import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import type { OperationNotice } from '../../../../features/runners/data/models/operation-notice';
import { SUCCESS_DISMISS_MS } from '../../hooks/use-notice-auto-dismiss';
import { OperationToast } from './OperationToast';

const onDismiss = vi.fn();

beforeEach(() => {
  onDismiss.mockReset();
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

function show(notice: OperationNotice, waitMs: number) {
  render(<OperationToast notice={notice} onDismiss={onDismiss} />);
  act(() => {
    vi.advanceTimersByTime(waitMs);
  });
}

it('clears a success confirmation automatically', () => {
  show({ id: 3, state: 'success', message: 'Done.' }, SUCCESS_DISMISS_MS);
  expect(screen.getByRole('status', { name: 'Runner operation finished' })).toHaveTextContent(
    'Done.',
  );
  expect(onDismiss).toHaveBeenCalledWith(3);
});

it('shows progress as a status without auto-dismissing it', () => {
  show({ id: 5, state: 'progress', message: 'Starting build-mac…' }, SUCCESS_DISMISS_MS * 3);
  expect(screen.getByRole('status', { name: 'Runner operation in progress' })).toHaveTextContent(
    'Starting build-mac…',
  );
  expect(onDismiss).not.toHaveBeenCalled();
});

it('keeps errors as alerts until they are dismissed', () => {
  show({ id: 4, state: 'error', message: 'Runner is busy.' }, SUCCESS_DISMISS_MS * 3);
  expect(screen.getByRole('alert', { name: 'Runner operation failed' })).toHaveTextContent(
    'Runner is busy.',
  );
  expect(onDismiss).not.toHaveBeenCalled();
  act(() => {
    screen.getByRole('button', { name: 'Dismiss' }).click();
  });
  expect(onDismiss).toHaveBeenCalledWith(4);
});
