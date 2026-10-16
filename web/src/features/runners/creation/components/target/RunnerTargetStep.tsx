import { cn } from '../../../../../shared/lib/cn';
import { useRunnerCreationStatus } from '../../hooks/use-runner-creation-status';
import { useRunnerCreationStore } from '../../stores/runner-creation-store';
import { AdvancedRunnerSettings } from './AdvancedRunnerSettings';
import { RegistrationTokenField } from './RegistrationTokenField';
import { RunnerScopeChoices } from './RunnerScopeChoices';
import { RunnerTargetField } from './RunnerTargetField';

export function RunnerTargetStep() {
  const kind = useRunnerCreationStore((state) => state.kind);
  const showPicker = useRunnerCreationStore((state) => state.mode === 'automatic');
  const failed = useRunnerCreationStore((state) => state.failure !== null);
  const { pending } = useRunnerCreationStatus();
  // The setup notice or the failure covers the step; it keeps its box so the dialog never resizes.
  const covered = pending || failed;
  let targetLabel = 'Organization';
  if (kind === 'repo') targetLabel = 'Repository';
  return (
    <div
      className={cn('mx-0 mb-2.5 min-h-37.5', { invisible: covered })}
      aria-hidden={covered || undefined}
      inert={covered}
    >
      <RunnerScopeChoices />
      {/* The manual target field carries its own label. */}
      {!!showPicker && <h3 className="mt-5 mb-2.5 text-xs font-semibold">{targetLabel}</h3>}
      <RunnerTargetField />
      <RegistrationTokenField />
      <AdvancedRunnerSettings />
    </div>
  );
}
