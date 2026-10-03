import type { Action, Runner } from '../../../../shared/api/types';
import { RunnerAccess } from './access/RunnerAccess';
import { RunnerConfiguration } from './configuration/RunnerConfiguration';
import { RunnerDiagnosticLink } from './controls/RunnerDiagnosticLink';
import { RunnerErrorNotice } from './controls/RunnerErrorNotice';
import { RunnerRecoveryNote } from './controls/RunnerRecoveryNote';
import { RunnerRemovalSection } from './controls/RunnerRemovalSection';
import { RunnerIdentity } from './identity/RunnerIdentity';
import { RunnerInspectorEmpty } from './identity/RunnerInspectorEmpty';
import { RunnerLabelsSection } from './labels/RunnerLabelsSection';

interface RunnerInspectorProps {
  runner: Runner | undefined;
  locked: boolean;
  connected: boolean;
  onAction: (runner: Runner, action: Action) => void;
  onOpenLogs?: () => void;
}

export function RunnerInspector({
  runner,
  locked,
  connected,
  onAction,
  onOpenLogs,
}: RunnerInspectorProps) {
  if (!runner) return <RunnerInspectorEmpty />;
  const unregistered = !runner.github_id || runner.deregistered;
  let action: 'start' | 'stop' = 'stop';
  if (runner.local_status === 'stopped') action = 'start';
  let githubError: string | null | undefined;
  if (connected) githubError = runner.github_error;
  const errors = [runner.error, githubError, runner.local_error].filter((error): error is string =>
    Boolean(error),
  );
  return (
    <div id="inspector-content">
      <RunnerIdentity
        r={runner}
        locked={locked}
        action={action}
        unregistered={unregistered}
        onAction={onAction}
      />
      <RunnerRecoveryNote runner={runner} locked={locked} onAction={onAction} />
      <RunnerErrorNotice errors={errors} />
      <RunnerLabelsSection
        runner={runner}
        locked={locked}
        connected={connected}
        onAction={onAction}
      />
      <RunnerConfiguration runner={runner} />
      <RunnerAccess key={runner.id} runnerId={runner.id} connected={connected} />
      {!!onOpenLogs && <RunnerDiagnosticLink onOpenLogs={onOpenLogs} />}
      <RunnerRemovalSection
        runner={runner}
        locked={locked}
        connected={connected}
        onAction={onAction}
      />
    </div>
  );
}
