import { GitHubStatus } from '../../../../features/github/components/status/GitHubStatus';
import { useNavigation } from '../../../navigation/hooks/use-navigation';
import { useRunnerWorkspace } from '../../../runners/hooks/use-runner-workspace';
import { useGitHubSetup } from '../../../setup/hooks/use-github-setup';
import { RunnerCreationActions } from './RunnerCreationActions';

export function AppHeaderActions() {
  const { page } = useNavigation();
  const { fleet } = useRunnerWorkspace();
  const { openSetup } = useGitHubSetup();
  return (
    <div className="toolbar-controls ml-auto flex w-auto shrink-0 items-center gap-2 max-sm:gap-1">
      <GitHubStatus interactive={!fleet.query.isPending} onOpen={openSetup} />
      {page.type === 'list' && <RunnerCreationActions />}
    </div>
  );
}
