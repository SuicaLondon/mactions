import type { OperationNotice } from '../../../../features/runners/data/models/operation-notice';
import { CheckIcon } from '../../../../shared/ui/icons/CheckIcon';
import { InfoIcon } from '../../../../shared/ui/icons/InfoIcon';
import { LoadingSpinner } from '../../../../shared/ui/loading/components/LoadingSpinner';
import { useNoticeAutoDismiss } from '../../hooks/use-notice-auto-dismiss';
import { StatusToast } from './StatusToast';

export function OperationToast({
  notice,
  onDismiss,
}: {
  notice: OperationNotice | null;
  onDismiss: (id: number) => void;
}) {
  useNoticeAutoDismiss(notice, onDismiss);
  if (!notice) return null;
  const dismiss = () => onDismiss(notice.id);
  if (notice.state === 'error') {
    return (
      <StatusToast
        tone="error"
        label="Runner operation failed"
        icon={<InfoIcon className="size-4 text-danger" />}
        onDismiss={dismiss}
      >
        <p className="m-0 whitespace-pre-wrap text-danger">{notice.message}</p>
        <p className="mx-0 mt-1 mb-0 text-muted">Check the runner details, then try again.</p>
      </StatusToast>
    );
  }
  if (notice.state === 'success') {
    return (
      <StatusToast
        tone="neutral"
        label="Runner operation finished"
        icon={<CheckIcon className="size-4 text-activity-success" />}
        onDismiss={dismiss}
      >
        <p className="m-0 whitespace-pre-wrap">{notice.message}</p>
      </StatusToast>
    );
  }
  return (
    <StatusToast
      tone="neutral"
      label="Runner operation in progress"
      icon={
        <span className="inline-flex text-accent">
          <LoadingSpinner label="Working" />
        </span>
      }
      onDismiss={dismiss}
    >
      <p className="m-0 whitespace-pre-wrap">{notice.message}</p>
    </StatusToast>
  );
}
