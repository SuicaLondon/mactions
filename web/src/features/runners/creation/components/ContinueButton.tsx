import { PendingLabel } from '../../../../shared/ui/controls/buttons/PendingLabel';
import { type RunnerCreationStep } from '../models/runner-creation';
import { useRunnerCreationStore } from '../stores/runner-creation-store';

interface ContinueButtonProps {
  step: RunnerCreationStep;
  canContinue: boolean;
  canCreate: boolean;
  waiting: boolean;
  /** The creation request is running. */
  pending: boolean;
}

/** Continue to target on the method step; Create runner, which submits the form, after it. */
export function ContinueButton({
  step,
  canContinue,
  canCreate,
  waiting,
  pending,
}: ContinueButtonProps) {
  const continueToTarget = useRunnerCreationStore((state) => state.continueToTarget);
  if (step === 1) {
    return (
      <button
        type="button"
        className="min-w-19.5 button-primary text-xs"
        disabled={!canContinue}
        onClick={() => {
          if (canContinue) continueToTarget();
        }}
      >
        Continue to target
      </button>
    );
  }
  let busy = 'Waiting…';
  if (pending) busy = 'Creating…';
  return (
    <button
      type="submit"
      className="min-w-19.5 button-primary text-xs"
      disabled={!canCreate}
      aria-describedby="create-runner-hint"
    >
      <PendingLabel pending={pending || waiting} idle="Create runner" busy={busy} />
    </button>
  );
}
