import { useEffect, useId, useRef } from 'react';

export function useManagerDialog() {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    let previous: HTMLElement | null = null;
    if (document.activeElement instanceof HTMLElement) previous = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      previous?.focus({ preventScroll: true });
    };
  }, []);
  return { ref, titleId };
}
