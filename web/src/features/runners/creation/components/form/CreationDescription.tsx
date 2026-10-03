import { InlineLoading } from '../../../../../shared/ui/loading/components/InlineLoading';
import { useRunnerCreationContext } from '../../hooks/use-runner-creation-context';

export function CreationDescription() {
  const { create, step } = useRunnerCreationContext();
  if (create.isPending) {
    return <InlineLoading label="Creating and starting your runner…" className="h-4.5 w-60" />;
  }
  if (step === 1) return 'Choose how to register this Mac.';
  return 'Choose a target. Next will create and start the runner.';
}
