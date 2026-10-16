import { type Action, type Runner } from '../../../../shared/api/types';
import { cn } from '../../../../shared/lib/cn';
import { useRunnerMenu } from '../hooks/use-runner-menu';
import { menuFocusIndex } from '../models/menu-focus';
import { runnerMenuItems } from '../models/runner-menu-items';

export interface RunnerMenuProps {
  runner: Runner;
  /** Viewport point the menu opens at; it is kept on screen. */
  x: number;
  y: number;
  /** A runner operation is in progress. */
  locked: boolean;
  connected: boolean;
  onAction: (runner: Runner, action: Action) => void;
  onClose: () => void;
}

export function RunnerMenu({
  runner,
  x,
  y,
  locked,
  connected,
  onAction,
  onClose,
}: RunnerMenuProps) {
  const ref = useRunnerMenu(x, y, onClose);
  const items = runnerMenuItems(runner, { locked, connected });
  return (
    <div
      ref={ref}
      role="menu"
      aria-label={`Actions for ${runner.name}`}
      tabIndex={-1}
      className={cn(
        'fixed z-100 w-47.5 rounded-lg border border-line bg-surface p-1.25',
        'px-2.5 shadow-lg',
      )}
      style={{ left: x, top: y }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' || event.key === 'Tab') {
          event.preventDefault();
          onClose();
          return;
        }
        const buttons = [
          ...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'),
        ];
        const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
        const next = menuFocusIndex(event.key, current, buttons.length);
        if (next === undefined) return;
        event.preventDefault();
        buttons[next]?.focus();
      }}
    >
      {items.map((item) => (
        <button
          key={item.action}
          role="menuitem"
          disabled={item.disabled}
          className={cn(
            'block w-full border-0 bg-transparent py-2 text-left shadow-none',
            'focus-visible:bg-accent/10 enabled:hover:bg-accent/10',
            { 'text-danger': item.action === 'delete' },
          )}
          onClick={() => {
            onClose();
            onAction(runner, item.action);
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
