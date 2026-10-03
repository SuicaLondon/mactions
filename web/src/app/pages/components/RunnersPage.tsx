import { useCallback } from 'react';

import { RunnerList } from '../../../features/runners/list/components/RunnerList';
import type { RunnerSelection } from '../../../features/runners/list/models/runner-list';
import { useNavigation } from '../../navigation/hooks/use-navigation';
import { useRunnerWorkspace } from '../../runners/hooks/use-runner-workspace';
import { useGitHubSetup } from '../../setup/hooks/use-github-setup';

export function RunnersPage() {
  const { preferences, openPage } = useNavigation();
  const { rows, fleet, inspector, openMenu, openCreate } = useRunnerWorkspace();
  const { connection, connected } = useGitHubSetup();
  const openRunner = useCallback(
    (runner: RunnerSelection) => openPage({ type: 'runner', runner }),
    [openPage],
  );
  let connectionState: boolean | undefined = connected;
  if (connection.isPending) connectionState = undefined;

  return (
    <RunnerList
      scope={preferences.scope}
      runners={rows}
      connected={connectionState}
      search={preferences.runnerSearch}
      status={preferences.runnerStatus}
      device={preferences.device}
      detailsKey={inspector.details?.key}
      onOpen={openRunner}
      onDetails={inspector.openDetails}
      onMenu={openMenu}
      onAdd={() => openCreate()}
      onRefreshLocal={fleet.refresh}
      localError={fleet.query.error?.message}
      onInventoryUpdate={inspector.updateInventoryDetails}
    />
  );
}
