import { RunDetailSkeleton } from '../../../features/actions/runs/components/detail/RunDetailSkeleton';
import { ActivityTableSkeleton } from '../../../features/actions/shared/components/table/ActivityTableSkeleton';
import { useConnection } from '../../../features/github/hooks/use-connection';
import { useRunnerInspectorStore } from '../../../features/runners/inspector/stores/runner-inspector-store';
import { InfoIcon } from '../../../shared/ui/icons/InfoIcon';
import { ServerIcon } from '../../../shared/ui/icons/ServerIcon';
import { useCurrentPage } from '../../navigation/hooks/use-current-page';
import { useConnectionCheck } from '../../setup/hooks/use-connection-check';
import { useWelcomeStore } from '../../setup/stores/welcome-store';
import { ActionsContent } from './ActionsContent';
import { ConnectionCheckError } from './ConnectionCheckError';
import { PageEmptyState } from './PageEmptyState';

export function ActionsPage() {
  const page = useCurrentPage();
  const connection = useConnection();
  const check = useConnectionCheck();
  const openSetup = useWelcomeStore((state) => state.openSetup);
  const openDetails = useRunnerInspectorStore((state) => state.openDetails);

  if (check.failed) {
    return (
      <ConnectionCheckError message={check.error} retrying={check.checking} onRetry={check.retry} />
    );
  }
  if (connection.isPending) {
    if (page.type === 'run') return <RunDetailSkeleton />;
    if (page.type === 'history') return <ActivityTableSkeleton kind="history" />;
    return <ActivityTableSkeleton kind="runs" />;
  }
  if (!connection.data?.connected) {
    return (
      <PageEmptyState
        title="Connect GitHub to view runs"
        icon={InfoIcon}
        message="Runner controls and diagnostic logs are available on this device."
        action={<button onClick={openSetup}>Connect GitHub</button>}
      />
    );
  }
  if (page.type === 'runner' && !page.runner.githubId) {
    return (
      <PageEmptyState
        title="Setup is incomplete"
        icon={ServerIcon}
        message="This runner does not have a GitHub identity yet. Open its details to resume setup."
        action={<button onClick={() => openDetails(page.runner)}>Runner Details</button>}
      />
    );
  }
  return <ActionsContent />;
}
