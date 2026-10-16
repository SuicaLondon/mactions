import { cn } from '../../../../../shared/lib/cn';
import { BranchIcon } from '../../../../../shared/ui/icons/BranchIcon';
import { type WorkflowRun } from '../../../data/types/activity-types';
import { Timestamp } from '../../../shared/components/Timestamp';

/**
 * The branch and start time that phones show in the run identity cell, since
 * the repository/branch and Started columns are hidden there.
 */
export function RunMobileMeta({ run }: { run: WorkflowRun }) {
  const branch = run.branch || 'Unknown branch';
  return (
    <span
      className={cn(
        'hidden min-w-0 items-center gap-1.25 text-xs',
        'whitespace-nowrap text-muted max-md:mt-1 max-md:flex',
      )}
      title={`${run.repository} · ${branch}`}
    >
      <BranchIcon className="size-3 shrink-0" />
      <span className="min-w-0 truncate">{branch}</span>
      {!!run.started_at && (
        <>
          <span aria-hidden="true">·</span>
          <span className="shrink-0">
            <Timestamp value={run.started_at} format="short" />
          </span>
        </>
      )}
    </span>
  );
}
