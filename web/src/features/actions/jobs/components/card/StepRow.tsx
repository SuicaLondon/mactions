import { useState } from 'react';

import { type Job, type JobStep } from '../../../../../shared/api/types';
import { duration, stateFor } from '../../../../../shared/lib/activity-format';
import { cn } from '../../../../../shared/lib/cn';
import { ChevronIcon } from '../../../../../shared/ui/icons/ChevronIcon';
import { StatusIcon } from '../../../../../shared/ui/icons/StatusIcon';
import { Timestamp } from '../../../shared/components/Timestamp';
import { statusTextClasses } from '../../../shared/models/status-classes';
import { type JobLogSource } from '../../types/job-log-source';
import { JobLogs } from '../logs/JobLogs';

export function StepRow({ job, step, source }: { job: Job; step: JobStep; source: JobLogSource }) {
  const [expanded, setExpanded] = useState(
    !!source.replay && (step.status === 'in_progress' || step.conclusion === 'failure'),
  );
  const state = stateFor(step.status, step.conclusion);
  const elapsed = duration(
    step.started_at,
    step.completed_at,
    step.status === 'in_progress',
    source.replay?.at,
  );
  let current: 'step' | undefined;
  if (step.status === 'in_progress') current = 'step';
  // The step's live or recorded log, or why there is none yet.
  let output = <JobLogs job={job} step={step} source={source} />;
  if (step.status === 'queued' || step.status === 'pending' || step.conclusion === 'skipped') {
    let message = 'This step has not started yet.';
    if (step.conclusion === 'skipped') message = 'This step was skipped.';
    output = <p className="m-0 px-4 py-3.5 text-xs/relaxed wrap-anywhere text-muted">{message}</p>;
  }
  return (
    <li className="not-first:border-t not-first:border-t-line" aria-current={current}>
      <button
        className={cn(
          'focus-visible:relative focus-visible:z-2',
          'flex w-full focus-visible:-outline-offset-3 enabled:hover:bg-canvas',
          'gap-2.25 rounded-none border-0 bg-surface px-3.5 py-3 enabled:hover:filter-none',
          'text-left text-xs whitespace-normal shadow-none max-sm:gap-1.5 max-sm:p-2.5',
          { 'bg-activity-running/5': step.status === 'in_progress' },
        )}
        aria-label={`${step.name}, ${state.label}, ${elapsed}`}
        aria-expanded={expanded}
        aria-controls={`job-${job.id}-step-${step.number}`}
        onClick={() => setExpanded(!expanded)}
      >
        <ChevronIcon className={cn('size-2.75 text-muted', { 'rotate-90': expanded })} />
        <span
          className={cn(
            'z-1 grid size-5 flex-none place-items-center rounded-full',
            'bg-transparent',
            state.tone,
            statusTextClasses[state.tone],
          )}
        >
          <StatusIcon className="size-3.25" name={state.icon} />
        </span>
        <span
          className={cn(
            'min-w-0 flex-1 leading-normal wrap-anywhere text-foreground',
            'font-medium',
          )}
        >
          {step.name}
        </span>
        <span
          className={cn(
            'text-xs capitalize max-sm:hidden',
            state.tone,
            statusTextClasses[state.tone],
          )}
        >
          {state.label}
        </span>
        <span className="min-w-10.75 text-right text-xs text-muted tabular-nums">{elapsed}</span>
      </button>
      {!!expanded && (
        <div
          id={`job-${job.id}-step-${step.number}`}
          role="region"
          aria-label={`Output for ${step.name}`}
        >
          <div
            className={cn(
              'flex flex-wrap gap-x-4.5 gap-y-1.5 bg-canvas px-4 py-2.25',
              'text-xs text-muted',
            )}
          >
            <span>
              Started <Timestamp value={step.started_at} format="full" />
            </span>
            <span>
              Finished <Timestamp value={step.completed_at} format="full" />
            </span>
          </div>
          {output}
        </div>
      )}
    </li>
  );
}
