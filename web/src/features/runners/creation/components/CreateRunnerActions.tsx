import { cn } from '../../../../shared/lib/cn';
import { useRunnerCreationStatus } from '../hooks/use-runner-creation-status';
import { useRunnerCreationStore } from '../stores/runner-creation-store';
import { ContinueButton } from './ContinueButton';

export interface CreateRunnerActionsProps {
  hint: string;
  canContinue: boolean;
  canCreate: boolean;
  waiting: boolean;
  onCancel: () => void;
}

export function CreateRunnerActions({
  hint,
  canContinue,
  canCreate,
  waiting,
  onCancel,
}: CreateRunnerActionsProps) {
  const step = useRunnerCreationStore((state) => state.step);
  const goBack = useRunnerCreationStore((state) => state.goBack);
  const { pending } = useRunnerCreationStatus();
  return (
    <>
      {/* Always reserved, so the hint appearing or clearing never moves the actions. The method
          step never shows a hint, so phones skip the reserved line there. */}
      <p
        id="create-runner-hint"
        className={cn('mt-0 mb-2 min-h-4 text-right text-xs text-muted', {
          'max-md:hidden': step === 1,
        })}
      >
        {hint}
      </p>
      <div className="flex justify-end gap-2">
        {!!(step > 1) && (
          <button
            type="button"
            className="mr-auto min-w-19.5 text-xs"
            disabled={pending}
            onClick={goBack}
          >
            Back
          </button>
        )}
        <button type="button" disabled={pending} onClick={onCancel} className="min-w-19.5 text-xs">
          Cancel
        </button>
        <ContinueButton
          step={step}
          canContinue={canContinue}
          canCreate={canCreate}
          waiting={waiting}
          pending={pending}
        />
      </div>
    </>
  );
}
