import { type stateFor } from '../../../../../shared/lib/activity-format';
import { cn } from '../../../../../shared/lib/cn';
import { ExternalLinkIcon } from '../../../../../shared/ui/icons/navigation/ExternalLinkIcon';
import { StatusIcon } from '../../../../../shared/ui/icons/status/StatusIcon';
import { statusTextClasses } from '../../../shared/models/status-classes';
import { type JobCard } from './JobCard';

export function JobCardHeader({
  state,
  job,
}: {
  state: ReturnType<typeof stateFor>;
  job: Parameters<typeof JobCard>[0]['job'];
}) {
  return (
    <header
      className={cn(
        'job-heading flex items-center gap-2.75 px-4 pt-4 pb-3.5',
        'max-md:grid max-md:grid-cols-[auto_minmax(0,1fr)] max-md:gap-2 max-md:p-3',
      )}
    >
      <span
        className={cn(
          'job-symbol grid size-8 flex-none place-items-center rounded-full bg-current/10',
          state.tone,
          statusTextClasses[state.tone],
        )}
      >
        <StatusIcon className="size-4" name={state.icon} />
      </span>
      <div className="job-title mx-0 mb-1 min-w-0 flex-1">
        <p className="mt-0 text-xs wrap-anywhere text-muted">
          {job.workflow} <span className="ml-1 tabular-nums">#{job.run_number}</span>
        </p>
        <h3 className="m-0 text-xs leading-normal font-semibold">
          <a
            className={cn(
              'wrap-anywhere text-foreground no-underline focus-visible:outline-2',
              'hover:text-accent focus-visible:-outline-offset-2 focus-visible:outline-accent',
              'hover:underline',
            )}
            href={job.url}
            target="_blank"
            rel="noreferrer"
          >
            {job.name}
            <ExternalLinkIcon className="ml-1.75 size-3 text-muted" />
          </a>
        </h3>
      </div>
      <span
        className={cn(
          'job-status shrink-0 rounded-md bg-current/10 px-2 py-1 text-xs font-medium',
          'capitalize max-md:col-start-2 max-md:justify-self-start',
          state.tone,
          statusTextClasses[state.tone],
        )}
      >
        {state.label}
      </span>
    </header>
  );
}
