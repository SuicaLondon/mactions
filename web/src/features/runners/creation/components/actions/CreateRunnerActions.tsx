import { useRunnerCreationContext } from '../../hooks/use-runner-creation-context';
import { ContinueButton } from './ContinueButton';

export function CreateRunnerActions() {
  const { step, create, close, goBack } = useRunnerCreationContext();
  return (
    <div className="dialog-actions create-actions mt-6 flex justify-end gap-2">
      {!!(step > 1) && (
        <button
          type="button"
          className="create-back mr-auto min-w-19.5 text-xs"
          disabled={create.isPending}
          onClick={goBack}
        >
          Back
        </button>
      )}
      <button
        type="button"
        disabled={create.isPending}
        onClick={close}
        className="min-w-19.5 text-xs"
      >
        Cancel
      </button>
      <ContinueButton />
    </div>
  );
}
