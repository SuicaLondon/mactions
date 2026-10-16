import { cn } from '../../../shared/lib/cn';
import { sentence } from '../../../shared/lib/sentence';

/** A failed load in the picker menu, with a retry of the page that failed. */
export function ScopePickerFooter({
  error,
  nextPageFailed,
  retrying,
  onRetry,
}: {
  error: Error;
  /** Only the latest page failed, so earlier choices are still listed. */
  nextPageFailed: boolean;
  retrying: boolean;
  onRetry: () => void;
}) {
  let title = "Couldn't load more choices.";
  if (!nextPageFailed) title = "Couldn't load choices.";
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-2 rounded-md border',
        'border-danger/20 bg-danger/4 px-3 py-2.5 text-xs/normal',
      )}
      role="alert"
    >
      <p className="m-0 min-w-0 wrap-anywhere whitespace-normal text-danger">
        {title} {sentence(error.message)} Check the GitHub connection, then retry.
      </p>
      <button
        type="button"
        className={cn(
          'min-h-0 shrink-0 border-0 bg-transparent p-0 text-xs/4',
          'text-accent shadow-none',
        )}
        disabled={retrying}
        onClick={onRetry}
      >
        Retry
      </button>
    </div>
  );
}
