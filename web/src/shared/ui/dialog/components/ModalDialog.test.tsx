import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

import { ModalDialog } from './ModalDialog';

function renderDialog() {
  const onClose = vi.fn();
  render(
    <ModalDialog onClose={onClose}>
      {(titleId) => (
        <>
          <h2 id={titleId}>Edit labels</h2>
          <input aria-label="Labels" />
        </>
      )}
    </ModalDialog>,
  );
  return {
    onClose,
    dialog: screen.getByRole<HTMLDialogElement>('dialog', { name: 'Edit labels' }),
  };
}

it('asks its owner on every Escape and keeps the browser from closing it', () => {
  const { onClose } = renderDialog();
  const input = screen.getByRole('textbox', { name: 'Labels' });
  // A cancelled keydown never becomes a close request, so a second Escape cannot force one.
  expect(fireEvent.keyDown(input, { key: 'Escape' })).toBe(false);
  expect(fireEvent.keyDown(input, { key: 'Escape' })).toBe(false);
  expect(onClose).toHaveBeenCalledTimes(2);
});

it('reopens when the browser closes it while the owner still shows it', () => {
  const { onClose, dialog } = renderDialog();
  dialog.close();
  fireEvent(dialog, new Event('close'));
  expect(dialog).toHaveAttribute('open');
  expect(onClose).toHaveBeenCalledOnce();
});
