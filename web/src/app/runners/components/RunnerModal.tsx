import { CreateDialog } from '../../../features/runners/creation/components/CreateDialog';
import { ActionDialog } from '../../../features/runners/dialogs/components/ActionDialog';
import { StorageDialog } from '../../../features/runners/dialogs/components/StorageDialog';
import { useNavigation } from '../../navigation/hooks/use-navigation';
import { useRunnerWorkspace } from '../hooks/use-runner-workspace';

export function RunnerModal() {
  const { modal, fleet, closeModal, runOperation } = useRunnerWorkspace();
  const { preferences } = useNavigation();
  if (!modal) return null;
  if (modal.type === 'create') {
    let initialTarget: { kind: 'repo' | 'org'; name: string } | undefined;
    if (preferences.scope.repository) {
      initialTarget = { kind: 'repo', name: preferences.scope.repository };
    } else if (preferences.scope.organization) {
      initialTarget = { kind: 'org', name: preferences.scope.organization };
    }
    return (
      <CreateDialog
        initialTarget={initialTarget}
        initialMode={modal.initialMode}
        locked={fleet.locked || fleet.query.isPending}
        initializing={fleet.query.isPending}
        onClose={closeModal}
      />
    );
  }
  if (modal.type === 'action') {
    return (
      <ActionDialog
        runner={modal.runner}
        action={modal.action}
        locked={fleet.locked}
        onClose={closeModal}
        onRun={runOperation}
      />
    );
  }
  return (
    <StorageDialog path={fleet.query.data?.data_directory || 'Unavailable'} onClose={closeModal} />
  );
}
