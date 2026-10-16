import { InfoIcon } from '../../../../shared/ui/icons/InfoIcon';
import { StatusToast } from './StatusToast';

export function RunnerQueryAlert({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <StatusToast
      tone="error"
      label="Runner status unavailable"
      icon={<InfoIcon className="size-4 text-danger" />}
    >
      <p className="m-0 whitespace-pre-wrap text-danger">Could not refresh runners. {message}</p>
      <p className="mx-0 mt-1 mb-0 text-muted">
        mactions keeps retrying. Runner details may be out of date until it reconnects.
      </p>
      <button type="button" className="mt-2 text-xs" onClick={onRetry}>
        Retry Now
      </button>
    </StatusToast>
  );
}
