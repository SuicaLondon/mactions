import { useState } from 'react';

import type { Job } from '../../../../../shared/api/types';
import { duration, stateFor } from '../../../../../shared/lib/activity-format';
import { cn } from '../../../../../shared/lib/cn';
import { ClockIcon } from '../../../../../shared/ui/icons/status/ClockIcon';
import { TerminalIcon } from '../../../../../shared/ui/icons/system/TerminalIcon';
import { type ReplayLogs } from '../../types/replay-logs';
import { JobLogs } from '../logs/JobLogs';
import { JobCardHeader } from './JobCardHeader';
import { JobCardMetadata } from './JobCardMetadata';
import { JobCardSteps } from './JobCardSteps';

const jobResultClasses: Record<string, string> = {
  neutral: 'job-result-neutral',
  success: 'job-result-success',
  failure: 'job-result-failure',
  running: 'job-result-running',
  queued: 'job-result-queued',
};

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
  const [fullLog, setFullLog] = useState(false);
  const state = stateFor(job.status, job.conclusion);
  const completed = job.steps.filter((step) => step.status === 'completed').length;
  let runnerType: string | null = null;
  if (job.host_type === 'self-hosted') runnerType = 'Self-hosted';
  else if (job.host_type === 'github-hosted') runnerType = 'GitHub-hosted';
  let device: string | null = null;
  if (job.device === 'this_device') device = 'This device';
  else if (job.device === 'other_device') device = 'Other device';
  let actor: string | null = null;
  if (job.actor) actor = `@${job.actor}`;
  let triggeredBy: string | null = null;
  if (job.triggering_actor && job.triggering_actor !== job.actor) {
    triggeredBy = `@${job.triggering_actor}`;
  }
  let runLabel = `#${job.run_number}`;
  if (job.run_attempt) runLabel += ` · attempt ${job.run_attempt}`;
  let fullLogLabel = 'Full job log';
  if (fullLog) fullLogLabel = 'Hide full log';
  const details = [
    ['Trigger', job.event?.replaceAll('_', ' ')],
    ['Actor', actor],
    ['Triggered by', triggeredBy],
    ['Run', runLabel],
    [
      'Duration',
      duration(job.started_at, job.completed_at, job.status === 'in_progress', replay?.at),
    ],
    ['Runner', job.runner_name],
    ['Runner group', job.runner_group_name],
    ['Runner type', runnerType],
    ['Device', device],
  ];
  return (
    <article
      id={`job-${job.id}-details`}
      className={cn(
        'job-card job-detail mt-4 shrink-0 overflow-hidden rounded-lg border border-line',
        'bg-surface not-first:mt-2.5',
        jobResultClasses[state.tone],
        {
          'job-active border-activity-running/30': job.status !== 'completed',
        },
      )}
      aria-label={job.name}
    >
      <JobCardHeader state={state} job={job} />
      <JobCardMetadata job={job} details={details} />
      <div className="job-progress border-t border-t-line">
        <div
          className={cn(
            'job-output-heading flex items-center justify-between gap-3 bg-canvas px-3.5',
            'py-2.5 max-sm:flex-wrap',
          )}
        >
          <h4 className="m-0 text-xs font-semibold">
            Steps{' '}
            <span className="ml-2 text-xs font-normal whitespace-nowrap text-muted">
              {completed}/{job.steps.length} completed
            </span>
          </h4>
          <div className="job-output-actions">
            {!!onOpenHistory && (
              <button className="min-h-6.25 py-0.75 text-xs" onClick={() => onOpenHistory(job)}>
                <ClockIcon className="size-3.25" />
                Job history
              </button>
            )}
            <button
              className="min-h-6.25 py-0.75 text-xs"
              aria-expanded={fullLog}
              aria-controls={`job-${job.id}-full-log`}
              onClick={() => setFullLog((value) => !value)}
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
        {!!fullLog && (
          <section id={`job-${job.id}-full-log`} aria-label="Full job output">
            <JobLogs job={job} runnerId={runnerId} repository={repository} replay={replay} />
          </section>
        )}
        <JobCardSteps job={job} runnerId={runnerId} repository={repository} replay={replay} />
      </div>
    </article>
  );
}
