import { RemoteRunnerInspector } from '../../../features/runners/inspector/components/RemoteRunnerInspector';
import { RunnerInspector } from '../../../features/runners/inspector/components/RunnerInspector';
import { useNavigation } from '../../navigation/hooks/use-navigation';
import { useGitHubSetup } from '../../setup/hooks/use-github-setup';
import { useRunnerWorkspace } from '../hooks/use-runner-workspace';

export function RunnerDetailsContent() {
  const { fleet, inspector, onAction } = useRunnerWorkspace();
  const { connected } = useGitHubSetup();
  const { openPage } = useNavigation();
  const { details, selected } = inspector;
  if (!details) return null;
  if (selected) {
    return (
      <RunnerInspector
        key={selected.id}
        runner={selected}
        connected={connected}
        locked={fleet.locked}
        onAction={onAction}
        onOpenLogs={() => openPage({ type: 'diagnostics', runner: details })}
      />
    );
  }
  return <RemoteRunnerInspector runner={details} />;
}
