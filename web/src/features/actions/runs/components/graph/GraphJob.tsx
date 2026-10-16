import { stateFor } from '../../../../../shared/lib/activity-format';
import { cn } from '../../../../../shared/lib/cn';
import { LiveDuration } from '../../../../../shared/ui/duration/components/LiveDuration';
import { ChevronIcon } from '../../../../../shared/ui/icons/ChevronIcon';
import { StatusIcon } from '../../../../../shared/ui/icons/StatusIcon';
import type { JobSummary } from '../../../data/types/activity-types';
import { isFailed } from '../../../shared/models/activity-status';
import { statusTextClasses } from '../../../shared/models/status-classes';

export function GraphJob({
  job,
  label = job.name,
  presentation = 'standalone',
  ranOnSelectedRunner,
  onSelect,
}: {
  job: JobSummary;
  label?: string;
  presentation?: 'standalone' | 'group' | 'unmapped';
  /** The job ran on the runner the page is showing. */
  ranOnSelectedRunner: boolean;
  onSelect: (jobId: number) => void;
}) {
  const state = stateFor(job.status, job.conclusion);
  const failed = isFailed(job);
  return (
    <button
      className={cn(
        'flex h-19 min-h-0 w-full items-center justify-start gap-2.25',
        'rounded-md border border-line bg-surface px-3 py-2.5 text-left whitespace-normal',
        'text-foreground shadow-none enabled:hover:border-accent',
        'enabled:hover:bg-accent/5 enabled:hover:filter-none',
        {
          'h-13 rounded-none border-0 border-t border-line px-2.5 py-1.5': presentation === 'group',
          'h-17': presentation === 'unmapped',
        },
        state.tone,
        {
          // Grouped rows share the group's tinted border; their divider stays neutral.
          'border-activity-failure/60 enabled:hover:border-activity-failure':
            failed && presentation !== 'group',
          'bg-activity-failure/5': failed && presentation === 'group',
        },
        { 'ring-1 ring-accent/60': ranOnSelectedRunner },
      )}
      data-selected-runner={ranOnSelectedRunner || undefined}
      aria-label={`Open ${job.name}, ${state.label}`}
      data-failed={failed || undefined}
      onClick={() => onSelect(job.id)}
    >
      <span className={cn('inline-flex shrink-0 items-center', statusTextClasses[state.tone])}>
        <StatusIcon className="size-4.25 stroke-2" name={state.icon} />
      </span>
      <span
        className={cn('flex min-w-0 flex-1 flex-col gap-1.25', {
          'gap-0.5': presentation === 'group',
        })}
      >
        <strong
          className={cn('line-clamp-2 overflow-hidden text-xs/4 font-medium wrap-anywhere', {
            'line-clamp-1': presentation === 'group',
          })}
          title={job.name}
        >
          {label}
        </strong>
        <span className="flex justify-between gap-2 text-xs/3.5 text-muted">
          {state.label}
          <span className="tabular-nums">
            <LiveDuration
              start={job.started_at}
              end={job.completed_at}
              running={job.status === 'in_progress'}
            />
          </span>
        </span>
      </span>
      <ChevronIcon className="size-3 shrink-0 text-muted" />
    </button>
  );
}
