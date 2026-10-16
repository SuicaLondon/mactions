import { useElapsedSeconds } from '../../shared/hooks/use-elapsed-seconds';
import { slowLoadingMessage } from '../../shared/models/slow-loading';

/** Fills the reserved summary line while the first page of history is searched. */
export function HistorySummaryLoading() {
  const seconds = useElapsedSeconds();
  return (
    <span className="truncate text-muted">
      {slowLoadingMessage(
        'Searching recent runs for this job…',
        'Still searching GitHub for runs…',
        seconds,
      )}
    </span>
  );
}
