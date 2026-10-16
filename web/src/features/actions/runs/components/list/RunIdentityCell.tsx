import { type ReactNode } from 'react';

import { cn } from '../../../../../shared/lib/cn';
import { WorkflowIcon } from '../../../../../shared/ui/icons/WorkflowIcon';
import { type WorkflowRun } from '../../../data/types/activity-types';
import { Status } from '../../../shared/components/Status';
import { runEventLabel } from '../../models/run-event';
import { RunMobileMeta } from './RunMobileMeta';

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
  const hasTitle = title !== run.name;
  const eventLabel = runEventLabel(run.event);
  const jobs = run.jobs ?? [];
  const jobSummary = jobs
    .map((job) => {
      if (job.runner_name) return `${job.name} on ${job.runner_name}`;
      return job.name;
    })
    .join(', ');
  // A run without its own title names the event that started it instead.
  let subtitle: ReactNode = null;
  if (hasTitle) {
    subtitle = (
      <span
        className={cn(
          'block max-w-full overflow-hidden text-xs text-ellipsis',
          'whitespace-nowrap text-foreground',
          // Phones wrap the title to two lines so runs with similar titles stay apart.
          'max-md:line-clamp-2 max-md:wrap-anywhere max-md:whitespace-normal',
        )}
        title={title}
      >
        {title}
      </span>
    );
  } else if (eventLabel) {
    subtitle = (
      <span
        className={cn(
          'block max-w-full overflow-hidden text-xs text-ellipsis',
          'whitespace-nowrap text-muted italic',
        )}
      >
        {eventLabel}
      </span>
    );
  }
  return (
    <td className={className}>
      <button
        className={cn(
          'flex min-h-0 w-full min-w-0 flex-col items-start gap-1.25',
          'rounded-none border-0 bg-transparent p-0 text-left whitespace-normal shadow-none',
          'hover:bg-transparent hover:filter-none',
        )}
        data-row-focus
        onClick={() => onOpen(run)}
        aria-label={`Open ${run.name} run #${run.number} in ${run.repository}`}
      >
        <span
          className={cn(
            // Phones keep the result badge on this line; the workflow name truncates instead.
            'flex max-w-full min-w-0 flex-wrap items-center gap-x-1.75',
            'max-md:flex-nowrap',
            'max-md:w-full',
            'gap-y-0.5 leading-snug text-accent',
          )}
        >
          <span className="flex max-w-full min-w-0 items-center gap-1.75">
            <WorkflowIcon className="size-3.75 shrink-0 text-muted" />
            <strong className="min-w-0 truncate text-xs font-semibold" title={run.name}>
              {run.name}
            </strong>
          </span>
          <span className="max-w-full min-w-0 truncate text-xs text-muted max-md:shrink-0">
            #{run.number}
            {!!(run.attempt > 1) && ` · attempt ${run.attempt}`}
          </span>
          {/* Phones hide the Result column, so the badge joins the first line. */}
          <span className="ml-auto hidden shrink-0 max-md:inline-flex">
            <Status compact status={run.status} conclusion={run.conclusion} />
          </span>
        </span>
        {subtitle}
      </button>
      <RunMobileMeta run={run} />
      {!!jobs.length && (
        <span
          className={cn(
            'mt-1.25 block overflow-hidden text-xs text-ellipsis',
            'whitespace-nowrap text-muted max-md:hidden',
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
