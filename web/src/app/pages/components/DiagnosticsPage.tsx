import { RunnerActivity } from '../../../features/runners/activity/components/RunnerActivity';
import { useNavigation } from '../../navigation/hooks/use-navigation';
import { useRunnerWorkspace } from '../../runners/hooks/use-runner-workspace';
import { useGitHubSetup } from '../../setup/hooks/use-github-setup';
import { PageEmptyState } from './PageEmptyState';

export function DiagnosticsPage() {
  const { page, goBack } = useNavigation();
  const { rows } = useRunnerWorkspace();
  const { connected } = useGitHubSetup();
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
