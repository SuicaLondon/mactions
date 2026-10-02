import { useEffect, useRef } from 'react';
import type { Action, Runner } from './types';

export function RunnerMenu({ runner, x, y, locked, connected, onAction, onClose }: { runner: Runner; x: number; y: number; locked: boolean; connected: boolean; onAction: (runner: Runner, action: Action) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const registered = Boolean(runner.github_id) && !runner.deregistered;
  const action = runner.local_status === 'stopped' ? 'start' : 'stop';
  const items: { label: string; action: Action; disabled: boolean }[] = [
    { label: action === 'start' ? 'Start' : 'Stop…', action, disabled: locked || (action === 'start' && !registered) },
    { label: 'Restart…', action: 'restart', disabled: locked || !registered },
    { label: 'Edit labels…', action: 'labels', disabled: locked || !registered || !connected },
    ...(!registered && !runner.deregistered ? [{ label: 'Resume setup…', action: 'retry' as const, disabled: locked }] : []),
    { label: 'Delete Runner…', action: 'delete', disabled: locked || (!connected && !runner.deregistered) },
  ];
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const menu = ref.current!;
    const box = menu.getBoundingClientRect();
    menu.style.left = `${Math.max(8, Math.min(x, window.innerWidth - box.width - 8))}px`;
    menu.style.top = `${Math.max(8, Math.min(y, window.innerHeight - box.height - 8))}px`;
    (menu.querySelector<HTMLButtonElement>('button:not(:disabled)') ?? menu).focus();
    const dismiss = (event: PointerEvent) => { if (!menu.contains(event.target as Node)) onClose(); };
    const close = () => onClose();
    document.addEventListener('pointerdown', dismiss);
    window.addEventListener('resize', close);
    return () => { document.removeEventListener('pointerdown', dismiss); window.removeEventListener('resize', close); previous?.focus({ preventScroll: true }); };
  }, [x, y, onClose]);
  return <div ref={ref} role="menu" aria-label={`Actions for ${runner.name}`} tabIndex={-1} className="runner-menu" style={{ left: x, top: y }} onKeyDown={event => {
    if (event.key === 'Escape' || event.key === 'Tab') { event.preventDefault(); onClose(); }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault(); const buttons = [...ref.current!.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
      const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
      const index = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
      buttons[index]?.focus();
    }
  }}>{items.map(item => <button key={item.action} role="menuitem" disabled={item.disabled} className={item.action === 'delete' ? 'danger' : ''} onClick={() => { onClose(); onAction(runner, item.action); }}>{item.label}</button>)}</div>;
}
