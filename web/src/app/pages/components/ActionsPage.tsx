import { InfoIcon } from '../../../shared/ui/icons/status/InfoIcon';
import { ServerIcon } from '../../../shared/ui/icons/system/ServerIcon';
import { LoadingPlaceholder } from '../../../shared/ui/loading/components/LoadingPlaceholder';
import { useNavigation } from '../../navigation/hooks/use-navigation';
import { useRunnerWorkspace } from '../../runners/hooks/use-runner-workspace';
import { useGitHubSetup } from '../../setup/hooks/use-github-setup';
import { ActionsContent } from './ActionsContent';
import { PageEmptyState } from './PageEmptyState';

export function ActionsPage() {
  const { page } = useNavigation();
  const { connection, connected, openSetup } = useGitHubSetup();
  const { inspector } = useRunnerWorkspace();

  if (connection.isPending) {
    let kind: 'run' | 'history' | 'runs' = 'runs';
    if (page.type === 'run') kind = 'run';
    else if (page.type === 'history') kind = 'history';
    return <LoadingPlaceholder kind={kind} />;
  }
  if (!connected) {
    return (
      <PageEmptyState
        title="Connect GitHub to view runs"
        icon={<InfoIcon className="mb-4.5 size-11.5 stroke-2 text-muted" />}
        message="Runner controls and diagnostic logs are available on this device."
        action={<button onClick={openSetup}>Connect GitHub</button>}
      />
    );
  }
  if (page.type === 'runner' && !page.runner.githubId) {
    return (
      <PageEmptyState
        title="Setup is incomplete"
        icon={<ServerIcon className="mb-4.5 size-11.5 stroke-2 text-muted" />}
        message="This runner does not have a GitHub identity yet. Open its details to resume setup."
        action={<button onClick={() => inspector.openDetails(page.runner)}>Runner Details</button>}
      />
    );
  }
  return <ActionsContent />;
}
