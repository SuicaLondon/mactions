import type { Job } from '../../../../shared/api/types';
import { cn } from '../../../../shared/lib/cn';
import { ChevronIcon } from '../../../../shared/ui/icons/ChevronIcon';
import { StatusIcon } from '../../../../shared/ui/icons/StatusIcon';
import { elapsed, jobState } from '../../models/workflow-graph';

interface WorkflowJobProps {
  job: Job;
  runLabel: string;
  selected: boolean;
  onSelectJob: (id: number) => void;
  at: number;
}

export function WorkflowJob({ job, runLabel, selected, onSelectJob, at }: WorkflowJobProps) {
  const state = jobState(job);
  const current = job.steps.find((step) => step.status === 'in_progress');
  const completed = job.steps.filter((step) => step.status === 'completed').length;
  let detailsId: string | undefined;
  if (selected) detailsId = `job-${job.id}-details`;
  let progressLabel: string;
  if (current) progressLabel = current.name;
  else progressLabel = `${completed}/${job.steps.length} steps completed`;
  return (
    <li
      className={cn(
        // Connector lines: pseudo-element utilities supply an empty `content` themselves.
        'relative px-0 py-1.25 after:absolute after:top-1/2',
        'after:-left-6 after:h-px after:w-6 after:bg-muted/45',
        'before:absolute before:inset-y-0 before:-left-6 before:w-px before:bg-muted/45',
        'first:before:top-1/2 last:before:bottom-1/2',
      )}
    >
      <button
        className={cn(
          'flex min-h-19.5 w-full scroll-m-4.5 items-start',
          'justify-start gap-2.5 rounded-lg border border-line bg-surface px-3 py-2.75',
          'text-left whitespace-normal shadow-sm ring-accent',
          'enabled:hover:border-accent/45 enabled:hover:bg-accent/5',
          'enabled:hover:filter-none aria-expanded:border-accent',
          'aria-expanded:bg-accent/5 aria-expanded:ring-1',
          state.tone,
        )}
        aria-label={`${job.name}, ${state.label}, ${runLabel}`}
        aria-expanded={selected}
        aria-controls={detailsId}
        onClick={() => onSelectJob(job.id)}
      >
        <span
          className={cn(
            'mt-0.25 grid size-5 shrink-0 place-items-center',
            'rounded-full bg-current/10',
            {
              'text-muted': state.tone === 'neutral',
              'text-danger': state.tone === 'failure',
              'text-activity-running': state.tone === 'running',
              'text-activity-success': state.tone === 'success',
            },
            state.tone,
          )}
        >
          <StatusIcon name={state.icon} className="size-3.25" />
        </span>
        <span className="min-w-0 flex-1">
          <strong className="block text-xs/normal font-semibold wrap-anywhere" title={job.name}>
            {job.name}
          </strong>
          <span
            className={cn(
              'mt-0.75 flex flex-wrap items-center gap-2.5 text-xs',
              'leading-snug text-muted',
            )}
          >
            <span>{state.label}</span>
            <span className="tabular-nums">{elapsed(job, at)}</span>
          </span>
          {!!job.steps.length && (
            <small className="mt-1.25 block truncate text-xs/snug text-muted" title={current?.name}>
              {progressLabel}
            </small>
          )}
        </span>
        <ChevronIcon
          className={cn('size-3 self-center text-muted opacity-55', {
            'rotate-90 text-accent opacity-100': selected,
          })}
        />
      </button>
    </li>
  );
}
