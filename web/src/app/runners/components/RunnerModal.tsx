import { CreateDialog } from '../../../features/runners/creation/components/CreateDialog';
import { useRunnerOperationLocked } from '../../../features/runners/data/hooks/use-runner-operation-locked';
import { useRunnerOperationStatus } from '../../../features/runners/data/hooks/use-runner-operation-status';
import { useRunnerSnapshot } from '../../../features/runners/data/hooks/use-runner-snapshot';
import { useRunnersLoading } from '../../../features/runners/data/hooks/use-runners-loading';
import { ActionDialog } from '../../../features/runners/dialogs/components/ActionDialog';
import { StorageDialog } from '../../../features/runners/dialogs/components/StorageDialog';
import { useDialogOperation } from '../hooks/use-dialog-operation';
import { useRunnerWorkspaceStore } from '../stores/runner-workspace-store';

export function RunnerModal() {
  const modal = useRunnerWorkspaceStore((state) => state.modal);
  const closeModal = useRunnerWorkspaceStore((state) => state.closeModal);
  const locked = useRunnerOperationLocked();
  const loading = useRunnersLoading();
  const dataDirectory = useRunnerSnapshot((snapshot) => snapshot.data_directory);
  const { pending } = useRunnerOperationStatus();
  const runDialogOperation = useDialogOperation();
  if (!modal) return null;
  if (modal.type === 'create') {
    return <CreateDialog locked={locked || loading} initializing={loading} onClose={closeModal} />;
  }
  if (modal.type === 'action') {
    return (
      <ActionDialog
        runner={modal.runner}
        action={modal.action}
        locked={locked}
        pending={pending}
        error={modal.error}
        onClose={closeModal}
        onRun={runDialogOperation}
      />
    );
  }
  return <StorageDialog path={dataDirectory || 'Unavailable'} onClose={closeModal} />;
}
