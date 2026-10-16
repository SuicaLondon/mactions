import { useRunnerCreationStatus } from '../../hooks/use-runner-creation-status';
import { parseRunnerTarget } from '../../models/runner-creation';
import { useRunnerCreationStore } from '../../stores/runner-creation-store';
import { ManualRunnerTarget } from './ManualRunnerTarget';
import { RunnerTargetPicker } from './picker/RunnerTargetPicker';

/** Picks a discovered target with a GitHub connection, or takes a typed one with a token. */
export function RunnerTargetField() {
  const showPicker = useRunnerCreationStore((state) => state.mode === 'automatic');
  const kind = useRunnerCreationStore((state) => state.kind);
  const target = useRunnerCreationStore((state) => state.target);
  const setTarget = useRunnerCreationStore((state) => state.setTarget);
  const { pending } = useRunnerCreationStatus();
  if (showPicker) return <RunnerTargetPicker />;
  return (
    <ManualRunnerTarget
      kind={kind}
      target={target}
      onChange={setTarget}
      disabled={pending}
      valid={parseRunnerTarget(kind, target).valid}
    />
  );
}
