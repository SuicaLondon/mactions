import { stateFor } from '../../../../../shared/lib/activity-format';
import { cn } from '../../../../../shared/lib/cn';
import { StatusIcon } from '../../../../../shared/ui/icons/StatusIcon';
import { WorkflowIcon } from '../../../../../shared/ui/icons/WorkflowIcon';
import type { JobSummary, WorkflowRun } from '../../../../actions/data/types/activity-types';
interface RunnerWorkRunLineProps {
  run: WorkflowRun;
  jobs: JobSummary[];
}
export function RunnerWorkRunLine({ run, jobs }: RunnerWorkRunLineProps) {
  return (
    <div className="flex h-4.5 min-w-0 items-center gap-2">
      <span
        className={cn(
          'inline-flex max-w-1/2 min-w-0 items-center gap-1 text-xs',
          '@max-3xl:max-w-1/2',
        )}
        title={`${run.repository} · Workflow ${run.name}, run #${run.number}`}
      >
        <WorkflowIcon className="size-3.25 shrink-0 text-muted" />
        <strong className="min-w-0 truncate font-medium">{run.name}</strong>
        <span className="shrink-0 text-xs text-muted">#{run.number}</span>
      </span>
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        {jobs.slice(0, 2).map((job) => {
          const state = stateFor(job.status, job.conclusion);
          return (
            <span
              className={cn('inline-flex min-w-0 flex-1 items-center gap-1 text-xs', {
                'text-activity-failure': state.tone === 'failure',
                'text-activity-running': state.tone === 'queued' || state.tone === 'running',
                'text-activity-success': state.tone === 'success',
              })}
              key={job.id}
              title={`${job.name} · ${state.label}`}
            >
              <StatusIcon name={state.icon} className="size-3 shrink-0" />
              <span
                className={cn(
                  'min-w-0 overflow-hidden text-ellipsis',
                  'whitespace-nowrap text-foreground',
                )}
              >
                {job.name}
              </span>
              <span className="sr-only">{state.label}</span>
            </span>
          );
        })}
        {!!(jobs.length > 2) && (
          <span
            className="shrink-0 text-xs whitespace-nowrap text-muted"
            title={jobs
              .slice(2)
              .map((job) => job.name)
              .join(', ')}
          >
            +{jobs.length - 2} jobs
          </span>
        )}
      </div>
    </div>
  );
}
