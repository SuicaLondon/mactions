import { RunnerDialog } from '../../dialogs/components/RunnerDialog';
import { RunnerCreationContext } from '../context/runner-creation-context';
import { useCreateRunner } from '../hooks/use-create-runner';
import { type CreateRunnerOptions } from '../models/runner-creation';
import { CreateRunnerForm } from './form/CreateRunnerForm';

export function CreateDialog(options: CreateRunnerOptions) {
  const creation = useCreateRunner(options);
  return (
    <RunnerCreationContext value={creation}>
      <RunnerDialog title="Add Runner" onClose={creation.close}>
        {(titleId) => <CreateRunnerForm titleId={titleId} />}
      </RunnerDialog>
    </RunnerCreationContext>
  );
}
