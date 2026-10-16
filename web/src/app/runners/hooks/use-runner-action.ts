import { useRunnerOperationLocked } from '../../../features/runners/data/hooks/use-runner-operation-locked';
import { useRunnerOperations } from '../../../features/runners/data/hooks/use-runner-operations';
import type { Action, Runner } from '../../../shared/api/types';
import { useRunnerWorkspaceStore } from '../stores/runner-workspace-store';

/** Starts a runner directly; other actions confirm in a dialog first. */
export function useRunnerAction() {
  const locked = useRunnerOperationLocked();
  const run = useRunnerOperations();
  return (runner: Runner, action: Action) => {
    if (locked) return;
    if (action !== 'start') {
      useRunnerWorkspaceStore.getState().openAction(runner, action);
      return;
    }
    run({
      path: `/api/runners/${runner.id}/${action}`,
      payload: {},
      message: `Starting ${runner.name}…`,
      success: `${runner.name} started. GitHub status may take a moment to update.`,
    });
  };
}
