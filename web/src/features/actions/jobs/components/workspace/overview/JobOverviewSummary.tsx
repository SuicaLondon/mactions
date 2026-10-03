import { duration } from '../../../../../../shared/lib/activity-format';
import { cn } from '../../../../../../shared/lib/cn';
import { Status } from '../../../../shared/components/Status';
import { type JobWorkspaceDetail } from '../JobWorkspaceDetail';

export function JobOverviewSummary({
  job,
  completed,
}: {
  job: Parameters<typeof JobWorkspaceDetail>[0]['job'];
  completed: number;
}) {
  return (
    <div
      className={cn(
        'job-overview-summary flex min-h-10.25 flex-wrap items-center gap-3 px-0 py-1.75',
        'text-xs text-muted @max-lg/job-detail:flex-wrap @max-lg/job-detail:gap-1.75',
      )}
    >
      <Status status={job.status} conclusion={job.conclusion} />
      <span className="job-overview-duration whitespace-nowrap tabular-nums">
        {duration(job.started_at, job.completed_at, job.status === 'in_progress')}
      </span>
      <div
        className={cn(
          'job-completion ml-auto grid gap-1.25 text-right text-xs whitespace-nowrap',
          'tabular-nums @max-lg/job-detail:min-w-26.25 @max-lg/job-detail:flex-1',
        )}
      >
        <span>
          {completed}/{job.steps.length} steps completed
        </span>
        <div
          className="h-1 w-37.5 overflow-hidden rounded-sm bg-line"
          role="progressbar"
          aria-label="Completed steps"
          aria-valuemin={0}
          aria-valuenow={completed}
          aria-valuemax={Math.max(1, job.steps.length)}
        >
          <span
            className="block h-full bg-activity-success"
            style={{ width: `${(completed / Math.max(1, job.steps.length)) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
