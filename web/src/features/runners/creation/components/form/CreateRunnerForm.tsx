import { useRunnerCreationContext } from '../../hooks/use-runner-creation-context';
import { CreateRunnerActions } from '../actions/CreateRunnerActions';
import { RegistrationStep } from '../registration/RegistrationStep';
import { RunnerTargetStep } from '../target/RunnerTargetStep';
import { CreateRunnerHeading } from './CreateRunnerHeading';
import { CreationProgress } from './CreationProgress';
import { SetupNotice } from './SetupNotice';
import { WaitingNotice } from './WaitingNotice';

export function CreateRunnerForm({ titleId }: { titleId: string }) {
  const { create, step, submit } = useRunnerCreationContext();
  return (
    <form
      aria-busy={create.isPending}
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <CreateRunnerHeading titleId={titleId} />
      <WaitingNotice />
      <CreationProgress />
      {!!(step === 1) && <RegistrationStep />}
      {!!(step === 2) && <RunnerTargetStep />}
      <SetupNotice />
      <CreateRunnerActions />
    </form>
  );
}
