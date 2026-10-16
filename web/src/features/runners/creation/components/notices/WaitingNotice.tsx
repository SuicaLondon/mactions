import { InlineLoading } from '../../../../../shared/ui/loading/components/InlineLoading';
import { useRunnerCreationStatus } from '../../hooks/use-runner-creation-status';
import { CreationNotice } from './CreationNotice';

export interface WaitingNoticeProps {
  /** What Add runner is waiting for, or null when nothing blocks it. */
  message: string | null;
  loading: boolean;
}

export function WaitingNotice({ message, loading }: WaitingNoticeProps) {
  const { pending } = useRunnerCreationStatus();
  if (!message || pending) return null;
  if (loading) {
    return (
      <CreationNotice>
        <InlineLoading label={message} />
      </CreationNotice>
    );
  }
  return <CreationNotice>{message}</CreationNotice>;
}
