import { cn } from '../../../../../../shared/lib/cn';
import { WorkflowIcon } from '../../../../../../shared/ui/icons/git/WorkflowIcon';
import type { WorkflowRun } from '../../../../data/types/activity-types';

export function RunIdentityCell({
  run,
  onOpen,
  className,
}: {
  run: WorkflowRun;
  onOpen: (run: WorkflowRun) => void;
  className: string;
}) {
  const title = run.title || run.name;
  const jobs = run.jobs ?? [];
  const jobSummary = jobs
    .map((job) => {
      if (job.runner_name) return `${job.name} on ${job.runner_name}`;
      return job.name;
    })
    .join(', ');
  return (
    <td className={cn('workflow-run-identity', className)}>
      <button
        className={cn(
          'workflow-run-open flex min-h-0 w-full min-w-0 flex-col items-start gap-1.25',
          'rounded-none border-0 bg-transparent p-0 text-left whitespace-normal shadow-none',
          'hover:bg-transparent hover:filter-none',
        )}
        onClick={() => onOpen(run)}
        aria-label={`Open ${run.name} run #${run.number} in ${run.repository}`}
      >
        <span
          className={cn(
            'workflow-run-name flex max-w-full min-w-0 items-center gap-1.75 leading-snug',
            'text-accent',
          )}
        >
          <WorkflowIcon className="size-3.75 shrink-0 text-muted" />
          <strong
            className={cn(
              'overflow-hidden text-xs font-semibold text-ellipsis whitespace-nowrap',
              'max-md:text-xs',
            )}
            title={run.name}
          >
            {run.name}
          </strong>
          <span className="shrink-0 text-xs whitespace-nowrap text-muted">
            #{run.number}
            {!!(run.attempt > 1) && ` · attempt ${run.attempt}`}
          </span>
        </span>
        {!!(title !== run.name) && (
          <span
            className={cn(
              'workflow-run-title block max-w-full overflow-hidden text-xs text-ellipsis',
              'whitespace-nowrap text-foreground',
            )}
            title={title}
          >
            {title}
          </span>
        )}
      </button>
      <span
        className={cn(
          'workflow-run-mobile-repo hidden max-md:mt-1.25 max-md:block',
          'max-md:overflow-hidden max-md:text-xs max-md:text-ellipsis',
          'max-md:whitespace-nowrap max-md:text-muted',
        )}
        title={`${run.repository} · ${run.branch || 'Unknown branch'}`}
      >
        {run.repository} · {run.branch || 'Unknown branch'}
      </span>
      {!!jobs.length && (
        <span
          className={cn(
            'workflow-run-jobs mt-1.25 block overflow-hidden text-xs text-ellipsis',
            'whitespace-nowrap text-muted',
          )}
          title={jobSummary}
        >
          <span className="mr-1 font-medium">Jobs</span>{' '}
          {jobs
            .slice(0, 2)
            .map((job) => job.name)
            .join(', ')}
          {!!(jobs.length > 2) && ` +${jobs.length - 2}`}
        </span>
      )}
    </td>
  );
}
