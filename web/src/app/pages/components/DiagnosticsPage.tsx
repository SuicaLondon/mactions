import { RunnerActivity } from '../../../features/runners/activity/components/RunnerActivity';
import { useLocalRunners } from '../../../features/runners/data/hooks/use-local-runners';
import { useCurrentPage } from '../../navigation/hooks/use-current-page';
import { useNavigationStore } from '../../navigation/stores/navigation-store';
import { useGitHubConnected } from '../../setup/hooks/use-github-connected';
import { PageEmptyState } from './PageEmptyState';

/** A runner's diagnostic logs on a full page. */
export function DiagnosticsPage() {
  const page = useCurrentPage();
  const goBack = useNavigationStore((state) => state.goBack);
  const rows = useLocalRunners();
  const connected = useGitHubConnected();
  if (page.type !== 'diagnostics') return null;
  const runner = rows.find((runner) => runner.id === page.runner.localId);
  if (runner) return <RunnerActivity runner={runner} connected={connected} logsOnly />;
  return (
    <PageEmptyState
      title="Runner is no longer available"
      action={<button onClick={goBack}>Back to runners</button>}
    />
  );
}
