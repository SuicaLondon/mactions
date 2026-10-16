import type { Action } from '../../../../shared/api/types';

const STATUS_DELAY = 'GitHub status may take a moment to update.';

/** Progress and confirmation text for an action confirmed in a dialog. */
export function operationCopy(action: Action, name: string) {
  switch (action) {
    case 'stop':
      return { progress: `Stopping ${name}…`, success: `${name} stopped. ${STATUS_DELAY}` };
    case 'restart':
      return { progress: `Restarting ${name}…`, success: `${name} restarted. ${STATUS_DELAY}` };
    case 'delete':
      return { progress: `Deleting ${name}…`, success: `${name} deleted.` };
    case 'retry':
      return { progress: `Resuming setup for ${name}…`, success: `${name} setup resumed.` };
    case 'labels':
      return { progress: `Updating labels for ${name}…`, success: `Labels for ${name} saved.` };
    default:
      return { progress: `Updating ${name}…`, success: `${name} updated.` };
  }
}
