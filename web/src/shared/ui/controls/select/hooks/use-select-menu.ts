import { type KeyboardEvent, useState } from 'react';

/** The select's open menu and search text; closing always clears the search. */
export function useSelectMenu({ onOpen, onClose }: { onOpen?: () => void; onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  function close() {
    setOpen(false);
    setInput('');
    onClose?.();
  }
  return {
    open,
    input,
    setInput,
    close,
    openMenu: () => {
      setOpen(true);
      onOpen?.();
    },
    /** Escape closes an open menu without reaching parent dialogs or panels. */
    onKeyDown: (event: KeyboardEvent) => {
      if (open && event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        close();
      }
    },
  };
}
