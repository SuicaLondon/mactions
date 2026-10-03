import { InlineLoading } from '../../../../../shared/ui/loading/components/InlineLoading';
import { useRunnerCreationContext } from '../../hooks/use-runner-creation-context';
import { CreationNotice } from './CreationNotice';

export function WaitingNotice() {
  const { create, waiting, waitingIsLoading } = useRunnerCreationContext();
  if (!waiting || create.isPending) return null;
  if (waitingIsLoading) {
    return (
      <CreationNotice>
        <InlineLoading label={waiting} />
      </CreationNotice>
    );
  }
  return <CreationNotice>{waiting}</CreationNotice>;
}
