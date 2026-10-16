import { useRunnerOperations } from '../../../features/runners/data/hooks/use-runner-operations';
import type { Operation } from '../../../shared/api/types';
import { useRunnerWorkspaceStore } from '../stores/runner-workspace-store';

/** Runs an action dialog's operation; the dialog stays open on failure so typed values survive. */
export function useDialogOperation() {
  const run = useRunnerOperations();
  return (operation: Operation) => {
    const workspace = useRunnerWorkspaceStore.getState();
    workspace.setActionError(undefined);
    run(operation, {
      reportsErrors: true,
      onSuccess: workspace.finishAction,
      onError: workspace.setActionError,
    });
  };
}
