import type { Action, Runner } from '../../../../shared/api/types';
import { RunnerAccess } from './access/RunnerAccess';
import { RunnerIdentity } from './RunnerIdentity';
import { RunnerNotice } from './RunnerNotice';
import { RunnerConfiguration } from './sections/RunnerConfiguration';
import { RunnerDiagnosticLink } from './sections/RunnerDiagnosticLink';
import { RunnerLabelsSection } from './sections/RunnerLabelsSection';
import { RunnerRemovalSection } from './sections/RunnerRemovalSection';

interface RunnerInspectorProps {
  runner: Runner;
  locked: boolean;
  connected: boolean;
  /** The runner action currently being performed for this runner, if any. */
  pendingAction: string | null;
  onAction: (runner: Runner, action: Action) => void;
  onOpenLogs: () => void;
}

export function RunnerInspector({
  runner,
  locked,
  connected,
  pendingAction,
  onAction,
  onOpenLogs,
}: RunnerInspectorProps) {
  const runAction = (action: Action) => onAction(runner, action);
  return (
    <div id="inspector-content">
      <RunnerIdentity
        runner={runner}
        locked={locked}
        pendingAction={pendingAction}
        onAction={runAction}
      >
        <RunnerNotice runner={runner} connected={connected} locked={locked} onAction={runAction} />
      </RunnerIdentity>
      <RunnerLabelsSection
        runner={runner}
        locked={locked}
        connected={connected}
        onAction={runAction}
      />
      <RunnerConfiguration runner={runner} />
      <RunnerAccess key={runner.id} runnerId={runner.id} connected={connected} />
      <RunnerDiagnosticLink onOpenLogs={onOpenLogs} />
      <RunnerRemovalSection
        deregistered={runner.deregistered}
        locked={locked}
        connected={connected}
        onAction={runAction}
      />
    </div>
  );
}
