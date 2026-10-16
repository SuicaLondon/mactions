import { cn } from '../../../../shared/lib/cn';
import { type HistorySummary } from '../models/history-summary';
import { HistorySummaryContent } from './HistorySummaryContent';
import { HistorySummaryLoading } from './HistorySummaryLoading';

/**
 * A reserved-height summary, so loading, paging, and polling never move the table below it:
 * one line, or two on phones where the summary wraps instead of scrolling sideways.
 */
export function JobHistorySummary({
  loading,
  summary,
}: {
  /** The first page of history is still being searched. */
  loading: boolean;
  summary: HistorySummary;
}) {
  let content = <HistorySummaryContent summary={summary} />;
  if (loading) content = <HistorySummaryLoading />;
  return (
    <div
      role="group"
      aria-label="Summary of loaded executions"
      aria-busy={loading}
      className={cn(
        'mx-0 mt-0 mb-2.5 flex min-h-5 min-w-0 items-start text-xs',
        'leading-5 text-muted tabular-nums max-sm:min-h-10',
      )}
    >
      {content}
    </div>
  );
}
