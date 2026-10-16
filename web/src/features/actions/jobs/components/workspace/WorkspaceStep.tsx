import type { Job, JobStep } from '../../../../../shared/api/types';
import { duration } from '../../../../../shared/lib/activity-format';
import { cn } from '../../../../../shared/lib/cn';
import { Status } from '../../../shared/components/Status';
import { Timestamp } from '../../../shared/components/Timestamp';
import { JobLogs } from '../logs/JobLogs';

export function WorkspaceStep({
  job,
  step,
  repository,
}: {
  job: Job;
  step: JobStep;
  repository: string;
}) {
  return (
    <section
      className="flex min-h-0 flex-1 flex-col pt-2.5"
      aria-label={`Step ${step.number}: ${step.name}`}
    >
      <header
        className={cn(
          'mb-2 flex shrink-0 flex-wrap items-center justify-between',
          'gap-x-4.5 gap-y-2',
        )}
      >
        <div
          className={cn(
            'flex min-w-0 shrink grow basis-55 items-center gap-2',
            'max-lg:basis-full',
          )}
        >
          <span className={cn('shrink-0 text-xs font-medium whitespace-nowrap', 'text-muted')}>
            Step {step.number}
          </span>
          <h3
            className={cn(
              'm-0 overflow-hidden text-sm/snug font-medium text-ellipsis',
              'whitespace-nowrap',
            )}
            title={step.name}
          >
            {step.name}
          </h3>
          <Status
            compact
            className="ml-auto shrink-0"
            status={step.status}
            conclusion={step.conclusion}
          />
        </div>
        <dl
          className={cn(
            'm-0 flex flex-wrap items-baseline gap-x-3.5 gap-y-1.5 p-0',
            'text-xs @max-lg/job-detail:gap-x-2.5 @max-lg/job-detail:gap-y-1.25',
          )}
        >
          <div className="inline-flex gap-1.25">
            <dt className="text-muted">Duration</dt>
            <dd className="m-0 whitespace-nowrap tabular-nums">
              {duration(step.started_at, step.completed_at, step.status === 'in_progress')}
            </dd>
          </div>
          <div className="inline-flex gap-1.25">
            <dt className="text-muted">Started</dt>
            <dd className="m-0 whitespace-nowrap tabular-nums">
              <Timestamp value={step.started_at} format="time" />
            </dd>
          </div>
          <div className="inline-flex gap-1.25">
            <dt className="text-muted">Finished</dt>
            <dd className="m-0 whitespace-nowrap tabular-nums">
              <Timestamp value={step.completed_at} format="time" />
            </dd>
          </div>
        </dl>
      </header>
      <div
        id={`job-${job.id}-selected-step-${step.number}-log`}
        className="m-0 flex min-h-0 flex-1 flex-col p-0"
        role="region"
        aria-label={`Output for ${step.name}`}
      >
        <JobLogs job={job} step={step} source={{ repository }} fill />
      </div>
    </section>
  );
}
