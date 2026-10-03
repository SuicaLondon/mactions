import type { Action, Runner } from '../../../../shared/api/types';
import { cn } from '../../../../shared/lib/cn';
import { useRunnerMenu } from '../hooks/use-runner-menu';

export function RunnerMenu({
  runner,
  x,
  y,
  locked,
  connected,
  onAction,
  onClose,
}: {
  runner: Runner;
  x: number;
  y: number;
  locked: boolean;
  connected: boolean;
  onAction: (runner: Runner, action: Action) => void;
  onClose: () => void;
}) {
  const ref = useRunnerMenu(x, y, onClose);
  const registered = !!runner.github_id && !runner.deregistered;
  let action: 'start' | 'stop' = 'stop';
  let actionLabel = 'Stop…';
  if (runner.local_status === 'stopped') {
    action = 'start';
    actionLabel = 'Start';
  }
  const items: {
    label: string;
    action: Action;
    disabled: boolean;
  }[] = [
    {
      label: actionLabel,
      action,
      disabled: locked || (action === 'start' && !registered),
    },
    { label: 'Restart…', action: 'restart', disabled: locked || !registered },
    {
      label: 'Edit labels…',
      action: 'labels',
      disabled: locked || !registered || !connected,
    },
  ];
  if (!registered && !runner.deregistered)
    items.push({ label: 'Resume setup…', action: 'retry', disabled: locked });
  items.push({
    label: 'Delete Runner…',
    action: 'delete',
    disabled: locked || (!connected && !runner.deregistered),
  });

  return (
    <div
      ref={ref}
      role="menu"
      aria-label={`Actions for ${runner.name}`}
      tabIndex={-1}
      className={cn(
        'runner-menu fixed z-100 w-47.5 rounded-lg border border-line bg-surface p-1.25',
        'px-2.5 shadow-lg',
      )}
      style={{ left: x, top: y }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' || event.key === 'Tab') {
          event.preventDefault();
          onClose();
        }
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
          event.preventDefault();
          const buttons = [
            ...ref.current!.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'),
          ];
          const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
          let index;
          if (event.key === 'Home') index = 0;
          else if (event.key === 'End') index = buttons.length - 1;
          else {
            let direction = -1;
            if (event.key === 'ArrowDown') direction = 1;
            index = (current + direction + buttons.length) % buttons.length;
          }
          buttons[index]?.focus();
        }
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
            { 'danger text-danger': item.action === 'delete' },
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
