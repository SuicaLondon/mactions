import { PendingLabel } from '../../../shared/ui/controls/buttons/PendingLabel';
import { InfoIcon } from '../../../shared/ui/icons/InfoIcon';
import { PageEmptyState } from './PageEmptyState';

export function ConnectionCheckError({
  message,
  retrying,
  onRetry,
}: {
  /** Absent while a retry is in flight; the previous error is cleared when it starts. */
  message: string | undefined;
  retrying: boolean;
  onRetry: () => void;
}) {
  let detail = 'Checking the GitHub connection again…';
  if (message) detail = `${message} Runs appear here once the connection check succeeds.`;
  return (
    <PageEmptyState
      title="Could not check GitHub connection"
      icon={InfoIcon}
      tone="danger"
      message={detail}
      action={
        <button
          onClick={() => {
            if (!retrying) onRetry();
          }}
          aria-disabled={retrying || undefined}
          aria-busy={retrying || undefined}
        >
          <PendingLabel pending={retrying} idle="Retry" busy="Retry" />
        </button>
      }
    />
  );
}
