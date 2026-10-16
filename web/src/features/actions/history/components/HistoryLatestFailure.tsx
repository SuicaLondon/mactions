import { cn } from '../../../../shared/lib/cn';
import {
  formatDateTime,
  formatShortDate,
  formatTime,
  formatUtcTimestamp,
} from '../../../../shared/lib/date';
import { historyExpandId, type HistorySummary } from '../models/history-summary';

/** The latest loaded failure, a button that focuses its row when the status filter shows it. */
export function HistoryLatestFailure({ latest }: { latest: HistorySummary['latestFailure'] }) {
  if (!latest) return <span className="whitespace-nowrap">no failures</span>;
  const label = `${formatShortDate(latest.at)}, ${formatTime(latest.at)}`;
  const time = (
    <time dateTime={formatUtcTimestamp(latest.at)} title={formatDateTime(latest.at)}>
      {label}
    </time>
  );
  // The status filter can hide the failed row; then there is nothing to reveal.
  if (!latest.shown) return <span className="whitespace-nowrap">last failure {time}</span>;
  return (
    <span className="whitespace-nowrap">
      last failure{' '}
      <button
        type="button"
        className={cn(
          'border-0 bg-transparent p-0 text-xs text-accent tabular-nums shadow-none',
          'max-md:min-h-10 pointer-coarse:min-h-10',
        )}
        aria-label={`Show last failure, ${label}`}
        onClick={() => document.getElementById(historyExpandId(latest.jobId))?.focus()}
      >
        {time}
      </button>
    </span>
  );
}
