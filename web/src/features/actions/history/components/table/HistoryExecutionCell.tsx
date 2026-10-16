import { duration, jobRunnerName } from '../../../../../shared/lib/activity-format';
import { cn } from '../../../../../shared/lib/cn';
import { BranchIcon } from '../../../../../shared/ui/icons/BranchIcon';
import { ChevronIcon } from '../../../../../shared/ui/icons/ChevronIcon';
import type { JobSummary } from '../../../data/types/activity-types';
import { Status } from '../../../shared/components/Status';
import { historyEnvironment, historyExpandLabel } from '../../models/history-item';
import { historyExpandId } from '../../models/history-summary';
import { HistoryRunnerName } from './HistoryRunnerName';

export function HistoryExecutionCell({
  job,
  current,
  ranOnSelectedRunner,
  expanded,
  onToggle,
  className,
}: {
  job: JobSummary;
  current: boolean;
  /** The execution ran on the runner the user came from. */
  ranOnSelectedRunner: boolean;
  expanded: boolean;
  onToggle: (expanded: boolean) => void;
  /** The row tone. */
  className: string;
}) {
  const runner = jobRunnerName(job);
  const environment = historyEnvironment(job);
  let mobileTitle = runner;
  if (environment) mobileTitle += ` · ${environment}`;
  return (
    <td
      className={cn(
        'table-cell h-16 border-0 border-t border-line px-3 py-2.25',
        'align-middle text-foreground max-lg:px-2.25',
        className,
        { 'bg-accent/5': ranOnSelectedRunner },
      )}
    >
      <button
        className={cn(
          'flex min-h-0 w-full min-w-0 items-center justify-start gap-2.25',
          'max-md:min-h-10',
          'rounded-none border-0 bg-transparent p-0 text-left whitespace-normal shadow-none',
          'hover:bg-transparent hover:filter-none',
        )}
        id={historyExpandId(job.id)}
        data-row-focus
        aria-label={historyExpandLabel(job)}
        aria-expanded={expanded}
        aria-controls={`history-job-${job.id}`}
        onClick={() => onToggle(!expanded)}
      >
        <ChevronIcon className={cn('size-3 shrink-0 text-muted', { 'rotate-90': expanded })} />
        <span className="min-w-0 max-md:flex-1">
          <strong className="block text-xs/snug font-medium text-foreground">
            Run #{job.run_number}
            {!!(job.run_attempt && job.run_attempt > 1) && ` · attempt ${job.run_attempt}`}
            {!!current && <span className="ml-1.75 text-xs font-medium text-accent">Current</span>}
          </strong>
          {/* Phones stack the result and duration here; their columns collapse. */}
          <span className="mt-1 hidden items-center gap-2 max-md:flex">
            <Status compact status={job.status} conclusion={job.conclusion} />
            <span className="text-xs whitespace-nowrap text-foreground tabular-nums">
              {duration(job.started_at, job.completed_at, job.status === 'in_progress')}
            </span>
          </span>
          <span className="mt-1.25 flex min-w-0 items-center gap-1.75 text-xs text-muted">
            <BranchIcon className="size-3 shrink-0 text-muted" />
            <span className="min-w-0 truncate" title={job.branch || 'Unknown branch'}>
              {job.branch || 'Unknown branch'}
            </span>
            {!!job.head_sha && (
              <code className="ml-0.5 shrink-0 text-xs max-lg:hidden" title={job.head_sha}>
                {job.head_sha.slice(0, 7)}
              </code>
            )}
            <span aria-hidden="true" className="hidden shrink-0 max-md:inline">
              ·
            </span>
            <HistoryRunnerName
              name={runner}
              title={mobileTitle}
              // The branch truncates first; the runner name keeps up to half the line.
              className="hidden max-w-1/2 shrink-0 max-md:flex"
            />
          </span>
        </span>
      </button>
    </td>
  );
}
