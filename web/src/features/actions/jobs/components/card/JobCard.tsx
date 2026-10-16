import { useState } from 'react';

import type { Job } from '../../../../../shared/api/types';
import { cn } from '../../../../../shared/lib/cn';
import { ClockIcon } from '../../../../../shared/ui/icons/ClockIcon';
import { TerminalIcon } from '../../../../../shared/ui/icons/TerminalIcon';
import { type JobLogSource } from '../../types/job-log-source';
import { type ReplayLogs } from '../../types/replay-logs';
import { JobLogs } from '../logs/JobLogs';
import { JobCardHeader } from './JobCardHeader';
import { JobCardMetadata } from './JobCardMetadata';
import { JobCardSteps } from './JobCardSteps';

export function JobCard({
  job,
  runnerId,
  repository,
  replay,
  onOpenHistory,
}: {
  job: Job;
  runnerId?: number;
  repository: string;
  replay?: ReplayLogs;
  onOpenHistory?: (job: Job) => void;
}) {
  const [fullLogOpen, setFullLogOpen] = useState(false);
  const source: JobLogSource = { repository, runnerId, replay };
  const completed = job.steps.filter((step) => step.status === 'completed').length;
  let fullLogLabel = 'Full job log';
  if (fullLogOpen) fullLogLabel = 'Hide full log';
  return (
    <article
      id={`job-${job.id}-details`}
      className={cn(
        'mt-4 shrink-0 overflow-hidden rounded-lg border border-line',
        'bg-surface not-first:mt-2.5',
        { 'border-activity-running/30': job.status !== 'completed' },
      )}
      aria-label={job.name}
    >
      <JobCardHeader job={job} />
      <JobCardMetadata job={job} replayAt={replay?.at} />
      <div className="border-t border-t-line">
        <div
          className={cn(
            'flex items-center justify-between gap-3 bg-canvas px-3.5',
            'py-2.5 max-sm:flex-wrap',
          )}
        >
          <h4 className="m-0 text-xs font-semibold">
            Steps{' '}
            <span className="ml-2 text-xs font-normal whitespace-nowrap text-muted">
              {completed}/{job.steps.length} completed
            </span>
          </h4>
          <div>
            {!!onOpenHistory && (
              <button className="min-h-6.25 py-0.75 text-xs" onClick={() => onOpenHistory(job)}>
                <ClockIcon className="size-3.25" />
                Job history
              </button>
            )}
            <button
              className="min-h-6.25 py-0.75 text-xs"
              aria-expanded={fullLogOpen}
              aria-controls={`job-${job.id}-full-log`}
              onClick={() => setFullLogOpen((value) => !value)}
            >
              <TerminalIcon className="size-3.25" />
              {fullLogLabel}
            </button>
          </div>
        </div>
        {!!job.steps.length && (
          <div
            className="h-0.75 w-full overflow-hidden bg-line"
            role="progressbar"
            aria-label={`Completed steps for ${job.name}`}
            aria-valuemin={0}
            aria-valuemax={job.steps.length}
            aria-valuenow={completed}
          >
            <span
              className={cn('block h-full bg-activity-success', {
                'bg-activity-running': job.status !== 'completed',
              })}
              style={{ width: `${(completed / job.steps.length) * 100}%` }}
            />
          </div>
        )}
        {!!fullLogOpen && (
          <section id={`job-${job.id}-full-log`} aria-label="Full job output">
            <JobLogs job={job} source={source} />
          </section>
        )}
        <JobCardSteps job={job} source={source} />
      </div>
    </article>
  );
}
