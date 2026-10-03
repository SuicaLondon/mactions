import { useState } from 'react';

import type { Job, JobStep } from '../../../../../shared/api/types';
import { duration, stateFor } from '../../../../../shared/lib/activity-format';
import { cn } from '../../../../../shared/lib/cn';
import { ChevronIcon } from '../../../../../shared/ui/icons/navigation/ChevronIcon';
import { StatusIcon } from '../../../../../shared/ui/icons/status/StatusIcon';
import { statusTextClasses } from '../../../shared/models/status-classes';
import { type ReplayLogs } from '../../types/replay-logs';
import { CardTimestamp } from './CardTimestamp';
import { StepEmptyOutput } from './StepEmptyOutput';

export function StepRow({
  step,
  job,
  runnerId,
  repository,
  replay,
}: {
  step: JobStep;
  job: Job;
  runnerId?: number;
  repository: string;
  replay?: ReplayLogs;
}) {
  const [expanded, setExpanded] = useState(
    !!replay && (step.status === 'in_progress' || step.conclusion === 'failure'),
  );
  const state = stateFor(step.status, step.conclusion);
  let current: 'step' | undefined;
  if (step.status === 'in_progress') current = 'step';
  return (
    <li
      className={cn('job-step-row not-first:border-t not-first:border-t-line', state.tone)}
      aria-current={current}
    >
      <button
        className={cn(
          'job-step-toggle focus-visible:relative focus-visible:z-2',
          'flex w-full focus-visible:-outline-offset-3 enabled:hover:bg-canvas',
          'gap-2.25 rounded-none border-0 bg-surface px-3.5 py-3 enabled:hover:filter-none',
          'text-left text-xs whitespace-normal shadow-none max-sm:gap-1.5 max-sm:p-2.5',
          { 'bg-activity-running/5': step.status === 'in_progress' },
        )}
        aria-label={`${step.name}, ${state.label}, ${duration(step.started_at, step.completed_at, step.status === 'in_progress', replay?.at)}`}
        aria-expanded={expanded}
        aria-controls={`job-${job.id}-step-${step.number}`}
        onClick={() => setExpanded(!expanded)}
      >
        <ChevronIcon className={cn('size-2.75 text-muted', { 'rotate-90': expanded })} />
        <span
          className={cn(
            'step-symbol z-1 grid size-5 flex-none place-items-center rounded-full',
            'bg-transparent',
            state.tone,
            statusTextClasses[state.tone],
          )}
        >
          <StatusIcon className="size-3.25" name={state.icon} />
        </span>
        <span
          className={cn(
            'step-name min-w-0 flex-1 leading-normal wrap-anywhere text-foreground',
            'font-medium',
          )}
        >
          {step.name}
        </span>
        <span
          className={cn(
            'step-status text-xs capitalize max-sm:hidden',
            state.tone,
            statusTextClasses[state.tone],
          )}
        >
          {state.label}
        </span>
        <span className="step-duration min-w-10.75 text-right text-xs text-muted tabular-nums">
          {duration(step.started_at, step.completed_at, step.status === 'in_progress', replay?.at)}
        </span>
      </button>
      {!!expanded && (
        <div
          id={`job-${job.id}-step-${step.number}`}
          className="step-output"
          role="region"
          aria-label={`Output for ${step.name}`}
        >
          <div
            className={cn(
              'step-timestamps flex flex-wrap gap-x-4.5 gap-y-1.5 bg-canvas px-4 py-2.25',
              'text-xs text-muted',
            )}
          >
            <span>
              Started <CardTimestamp value={step.started_at} />
            </span>
            <span>
              Finished <CardTimestamp value={step.completed_at} />
            </span>
          </div>
          <StepEmptyOutput
            step={step}
            job={job}
            runnerId={runnerId}
            repository={repository}
            replay={replay}
          />
        </div>
      )}
    </li>
  );
}
