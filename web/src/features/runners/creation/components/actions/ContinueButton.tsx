import { useRunnerCreationContext } from '../../hooks/use-runner-creation-context';
import { SubmitLabel } from './SubmitLabel';

export function ContinueButton() {
  const { step, canContinue, continueToTarget, canCreate } = useRunnerCreationContext();
  if (step === 1) {
    return (
      <button
        type="button"
        className="primary min-w-19.5 text-xs"
        disabled={!canContinue}
        onClick={continueToTarget}
      >
        Continue to Target
      </button>
    );
  }
  return (
    <button type="submit" className="primary min-w-19.5 text-xs" disabled={!canCreate}>
      <SubmitLabel />
    </button>
  );
}
