import { cn } from '../../../../../shared/lib/cn';
import { UpdateFailedIndicator } from '../../../../../shared/ui/feedback/components/UpdateFailedIndicator';
import { ChevronIcon } from '../../../../../shared/ui/icons/ChevronIcon';
import type { WorkflowRun } from '../../../data/types/activity-types';
import { Status } from '../../../shared/components/Status';
import type { RefreshState } from '../../../shared/types/refresh-state';

/**
 * The phone run header: one line with the run name, its result, and a
 * disclosure for the full details and Refresh. Wider viewports never show it.
 */
export function RunWorkspaceSummary({
  run,
  refresh,
  expanded,
  detailsId,
  onToggle,
}: {
  run: WorkflowRun;
  /** Keeps a failed refresh visible while the full header is collapsed. */
  refresh: RefreshState;
  expanded: boolean;
  /** The id of the full details this line expands. */
  detailsId: string;
  onToggle: () => void;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 md:hidden">
      <p className="m-0 min-w-0 flex-1 truncate text-sm font-semibold">
        {run.name} <span className="text-xs font-normal text-muted">#{run.number}</span>
      </p>
      <Status status={run.status} conclusion={run.conclusion} compact />
      {!expanded && (
        // The short label keeps the reserved slot narrow, leaving the run name more room.
        <UpdateFailedIndicator
          label="Failed"
          error={refresh.error}
          retrying={refresh.refreshing}
          onRetry={refresh.onRefresh}
        />
      )}
      <button
        type="button"
        className={cn(
          'flex size-10 min-h-10 min-w-10 shrink-0 items-center justify-center rounded-md',
          'border-0 bg-transparent p-0 text-muted shadow-none',
        )}
        aria-expanded={expanded}
        aria-controls={detailsId}
        aria-label="Run details"
        title="Run details"
        onClick={onToggle}
      >
        <ChevronIcon
          className={cn('size-4 transition-transform motion-reduce:transition-none', {
            'rotate-90': !expanded,
            '-rotate-90': expanded,
          })}
        />
      </button>
    </div>
  );
}
