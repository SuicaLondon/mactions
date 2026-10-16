import { useLocalRunners } from '../../../features/runners/data/hooks/use-local-runners';
import { useRunnerOperationLocked } from '../../../features/runners/data/hooks/use-runner-operation-locked';
import { useRunnerOperationStatus } from '../../../features/runners/data/hooks/use-runner-operation-status';
import { operationAction } from '../../../features/runners/data/models/operation-notice';
import { RemoteRunnerInspector } from '../../../features/runners/inspector/components/RemoteRunnerInspector';
import { RunnerInspector } from '../../../features/runners/inspector/components/RunnerInspector';
import { selectedRunner } from '../../../features/runners/inspector/models/runner-inspector';
import { useRunnerInspectorStore } from '../../../features/runners/inspector/stores/runner-inspector-store';
import { useNavigationStore } from '../../navigation/stores/navigation-store';
import { useGitHubConnected } from '../../setup/hooks/use-github-connected';
import { useRunnerAction } from '../hooks/use-runner-action';

/** The inspector for the selected runner: a local runner's controls, or a remote runner's summary. */
export function RunnerDetailsContent() {
  const runners = useLocalRunners();
  const locked = useRunnerOperationLocked();
  const { active: activeOperation } = useRunnerOperationStatus();
  const onAction = useRunnerAction();
  const connected = useGitHubConnected();
  const openPage = useNavigationStore((state) => state.openPage);
  const details = useRunnerInspectorStore((state) => state.details);
  const selected = selectedRunner(details, runners);
  if (!details) return null;
  if (selected) {
    const active = operationAction(activeOperation);
    let pendingAction: string | null = null;
    if (active?.runnerId === selected.id) pendingAction = active.action;
    return (
      <RunnerInspector
        key={selected.id}
        runner={selected}
        connected={connected}
        locked={locked}
        pendingAction={pendingAction}
        onAction={onAction}
        onOpenLogs={() => openPage({ type: 'diagnostics', runner: details })}
      />
    );
  }
  return <RemoteRunnerInspector runner={details} />;
}
