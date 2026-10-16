import type { ReactNode } from 'react';

import { useModalDialog } from '../hooks/use-modal-dialog';

/**
 * A modal dialog that opens on mount. Escape calls onClose, so the owner decides whether to
 * close. The content names the dialog by giving its heading the title id.
 */
export function ModalDialog({
  children,
  onClose,
}: {
  children: (titleId: string) => ReactNode;
  onClose: () => void;
}) {
  const { ref, titleId } = useModalDialog();
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onKeyDown={(event) => {
        // An open popover takes Escape first. Otherwise handle it here, because the browser
        // ignores a cancelled close on the second Escape in a row and closes the dialog itself.
        if (event.key !== 'Escape' || event.isDefaultPrevented()) return;
        if (document.querySelector(':popover-open')) return;
        event.preventDefault();
        onClose();
      }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={(event) => {
        // Reopen a dialog the browser closed while its owner still renders it.
        const dialog = event.currentTarget;
        if (dialog.open) return;
        dialog.showModal();
        onClose();
      }}
    >
      {children(titleId)}
    </dialog>
  );
}
