import { useCallback } from 'react';

import { useConnection } from '../../../features/github/hooks/use-connection';
import { useLocalRunners } from '../../../features/runners/data/hooks/use-local-runners';
import { useRunnerOperationLocked } from '../../../features/runners/data/hooks/use-runner-operation-locked';
import { useRunnersError } from '../../../features/runners/data/hooks/use-runners-error';
import { useRunnersRefresh } from '../../../features/runners/data/hooks/use-runners-refresh';
import { useRunnerInspectorStore } from '../../../features/runners/inspector/stores/runner-inspector-store';
import { RunnerList } from '../../../features/runners/list/components/RunnerList';
import type { RunnerSelection } from '../../../features/runners/list/models/runner-list';
import type { GitHubConnectionState } from '../../../features/runners/list/models/runner-list-status';
import { useNavigationStore } from '../../navigation/stores/navigation-store';
import { useRunnerWorkspaceStore } from '../../runners/stores/runner-workspace-store';

export function RunnersPage() {
  const preferences = useNavigationStore((state) => state.preferences);
  const openPage = useNavigationStore((state) => state.openPage);
  const rows = useLocalRunners();
  const error = useRunnersError();
  const refresh = useRunnersRefresh();
  const locked = useRunnerOperationLocked();
  const detailsKey = useRunnerInspectorStore((state) => state.details?.key);
  const openDetails = useRunnerInspectorStore((state) => state.openDetails);
  const updateInventoryDetails = useRunnerInspectorStore((state) => state.updateInventoryDetails);
  const openMenu = useRunnerWorkspaceStore((state) => state.openMenu);
  const openCreate = useRunnerWorkspaceStore((state) => state.openCreate);
  const connectionCheck = useConnection();
  const openRunner = useCallback(
    (runner: RunnerSelection) => openPage({ type: 'runner', runner }),
    [openPage],
  );
  let connection: GitHubConnectionState = 'disconnected';
  if (connectionCheck.isPending) connection = 'checking';
  else if (connectionCheck.data?.connected) connection = 'connected';

  return (
    <RunnerList
      scope={preferences.scope}
      connection={connection}
      local={{ runners: rows, error, onRefresh: refresh }}
      filters={{
        search: preferences.runnerSearch,
        status: preferences.runnerStatus,
        device: preferences.device,
      }}
      detailsKey={detailsKey}
      rowCallbacks={{ onOpen: openRunner, onDetails: openDetails, onMenu: openMenu }}
      onAdd={() => openCreate()}
      addDisabled={locked}
      onInventoryUpdate={updateInventoryDetails}
    />
  );
}
