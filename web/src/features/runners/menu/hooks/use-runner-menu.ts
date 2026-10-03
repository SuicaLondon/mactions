import { useEffect, useRef } from 'react';

export function useRunnerMenu(x: number, y: number, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let previous: HTMLElement | null = null;
    if (document.activeElement instanceof HTMLElement) previous = document.activeElement;
    const menu = ref.current!;
    const box = menu.getBoundingClientRect();
    menu.style.left = `${Math.max(8, Math.min(x, window.innerWidth - box.width - 8))}px`;
    menu.style.top = `${Math.max(8, Math.min(y, window.innerHeight - box.height - 8))}px`;
    (menu.querySelector<HTMLButtonElement>('button:not(:disabled)') ?? menu).focus();
    const dismiss = (event: PointerEvent) => {
      if (!menu.contains(event.target as Node)) onClose();
    };
    const close = () => onClose();
    document.addEventListener('pointerdown', dismiss);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      window.removeEventListener('resize', close);
      previous?.focus({ preventScroll: true });
    };
  }, [x, y, onClose]);
  return ref;
}
