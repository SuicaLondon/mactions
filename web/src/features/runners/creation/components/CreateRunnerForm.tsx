import { cn } from '../../../../shared/lib/cn';
import { useCreationReadiness } from '../hooks/use-creation-readiness';
import { useRunnerCreation } from '../hooks/use-runner-creation';
import { creationRequest } from '../models/runner-creation';
import { useRunnerCreationStore } from '../stores/runner-creation-store';
import { CreateRunnerActions } from './CreateRunnerActions';
import { CreationDescription } from './CreationDescription';
import { CreationProgress } from './CreationProgress';
import { CreationError } from './notices/CreationError';
import { SetupNotice } from './notices/SetupNotice';
import { WaitingNotice } from './notices/WaitingNotice';
import { RegistrationStep } from './RegistrationStep';
import { RunnerTargetStep } from './target/RunnerTargetStep';

export interface CreateRunnerFormProps {
  titleId: string;
  locked: boolean;
  initializing: boolean;
  onCancel: () => void;
  onCreated: () => void;
}

export function CreateRunnerForm({
  titleId,
  locked,
  initializing,
  onCancel,
  onCreated,
}: CreateRunnerFormProps) {
  const step = useRunnerCreationStore((state) => state.step);
  const readiness = useCreationReadiness({ locked, initializing });
  const create = useRunnerCreation(() => {
    useRunnerCreationStore.getState().setToken('');
    onCreated();
  });
  function submit() {
    if (step === 2 && readiness.canCreate) {
      create.mutate(creationRequest(useRunnerCreationStore.getState()));
    }
  }
  return (
    <form
      className="flex min-h-full flex-col"
      aria-busy={create.isPending}
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="mb-6">
        <h2 id={titleId}>Add runner</h2>
        <p className="m-0 min-h-9 text-xs/normal text-muted">
          <CreationDescription />
        </p>
      </div>
      <CreationProgress />
      {/* The target step reserves room for a failure with the GitHub access flow (taller on
          phones, where text wraps more). The setup notice and the failure cover the step, so
          neither resizes the dialog. */}
      <div
        className={cn('relative mb-6 grid max-md:mb-3', {
          'min-h-88 max-md:min-h-112': step === 2,
        })}
      >
        <div className="col-start-1 row-start-1 min-w-0">
          <WaitingNotice message={readiness.waiting} loading={readiness.waitingIsLoading} />
          {!!(step === 1) && <RegistrationStep />}
          {!!(step === 2) && <RunnerTargetStep />}
        </div>
        <div className="col-start-1 row-start-1 self-start">
          <SetupNotice />
        </div>
        {!!(step === 2) && <CreationError />}
      </div>
      {/* Sticky, so long steps such as Advanced settings never scroll the actions away. The
          negative offset lets it stick inside the dialog's bottom padding; at bottom-0 it would
          rise over the last line of the step. */}
      <div
        className={cn(
          'sticky -bottom-6 -mx-6 mt-auto -mb-6 border-t border-line',
          'bg-toolbar',
          'px-6 pt-3 pb-6',
        )}
      >
        <CreateRunnerActions
          hint={readiness.hint}
          canContinue={readiness.canContinue}
          canCreate={readiness.canCreate}
          waiting={Boolean(readiness.waiting)}
          onCancel={onCancel}
        />
      </div>
    </form>
  );
}
