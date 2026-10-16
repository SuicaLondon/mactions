import type { Action, Runner } from '../../../../shared/api/types';
import { isUnregistered } from '../../shared/models/runner-model';

export interface RunnerMenuItem {
  label: string;
  action: Action;
  disabled: boolean;
}

export interface RunnerMenuAvailability {
  /** A runner operation is in progress. */
  locked: boolean;
  connected: boolean;
}

/** The runner's context menu entries, disabled where the runner's state or GitHub prevents them. */
export function runnerMenuItems(
  runner: Runner,
  { locked, connected }: RunnerMenuAvailability,
): RunnerMenuItem[] {
  const registered = !isUnregistered(runner);
  let power: RunnerMenuItem = { label: 'Stop…', action: 'stop', disabled: locked };
  if (runner.local_status === 'stopped')
    power = { label: 'Start', action: 'start', disabled: locked || !registered };
  const items: RunnerMenuItem[] = [
    power,
    { label: 'Restart…', action: 'restart', disabled: locked || !registered },
    { label: 'Edit labels…', action: 'labels', disabled: locked || !registered || !connected },
  ];
  if (!registered && !runner.deregistered)
    items.push({ label: 'Resume setup…', action: 'retry', disabled: locked });
  items.push({
    label: 'Delete runner…',
    action: 'delete',
    disabled: locked || (!connected && !runner.deregistered),
  });
  return items;
}
