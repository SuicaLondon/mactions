import { cn } from '../../../../shared/lib/cn';
import { formatSummaryDuration, type HistorySummary } from '../models/history-summary';
import { HistoryLatestFailure } from './HistoryLatestFailure';

export function HistorySummaryContent({ summary }: { summary: HistorySummary }) {
  let scope = `${summary.loaded} loaded`;
  if (summary.filtered) scope += ', all statuses';
  let failures = `${summary.failed} failed`;
  if (summary.failureRate !== null) failures += ` (${summary.failureRate}%)`;
  const breakdown = [
    `${summary.succeeded} succeeded`,
    `${summary.other} cancelled or other`,
    `${summary.active} in progress`,
  ].join(', ');
  return (
    <span
      className="flex min-w-0 flex-wrap items-center gap-x-1.5"
      title={`${breakdown}. Covers only the executions loaded so far, regardless of the status filter. The failure rate excludes running and queued executions.`}
    >
      <span className="font-medium whitespace-nowrap text-foreground">{scope}</span>
      <span aria-hidden="true">·</span>
      <span
        className={cn('whitespace-nowrap', {
          'font-medium text-activity-failure': summary.failed > 0,
        })}
      >
        {failures}
      </span>
      <span aria-hidden="true">·</span>
      <span className="whitespace-nowrap">
        median {formatSummaryDuration(summary.medianSeconds)}
      </span>
      {/* Phones give the last failure its own line, so no separator ends the line above. */}
      <span aria-hidden="true" className="max-md:hidden">
        ·
      </span>
      <span className="max-md:basis-full">
        <HistoryLatestFailure latest={summary.latestFailure} />
      </span>
      <span className="sr-only">{breakdown}</span>
    </span>
  );
}
