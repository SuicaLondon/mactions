import { cn } from '../../../../../../shared/lib/cn';
import { BranchIcon } from '../../../../../../shared/ui/icons/git/BranchIcon';
import { ChevronIcon } from '../../../../../../shared/ui/icons/navigation/ChevronIcon';
import type { JobSummary } from '../../../../data/types/activity-types';

export function HistoryExecutionCell({
  job,
  selectedRunner,
  expanded,
  expandLabel,
  onToggle,
  environment,
  runner,
}: {
  job: JobSummary;
  selectedRunner: boolean;
  expanded: boolean;
  expandLabel: string;
  onToggle: (expanded: boolean) => void;
  environment: string;
  runner: string;
}) {
  return (
    <td
      className={cn(
        'job-history-execution',
        'table-cell h-16 border-0 border-t border-line bg-surface px-3 py-2.25',
        'align-middle text-foreground group-hover/history:bg-accent/5',
        'group-focus-within/history:bg-accent/5 max-lg:pr-2.25 max-lg:pl-2.25',
        { 'border-l-2 border-l-accent': selectedRunner },
      )}
    >
      <button
        className={cn(
          'history-expand flex min-h-0 w-full min-w-0 items-center justify-start gap-2.25',
          'rounded-none border-0 bg-transparent p-0 text-left whitespace-normal shadow-none',
          'hover:bg-transparent hover:filter-none',
        )}
        aria-label={expandLabel}
        aria-expanded={expanded}
        aria-controls={`history-job-${job.id}`}
        onClick={() => onToggle(!expanded)}
      >
        <ChevronIcon className={cn('size-3 shrink-0 text-muted', { 'rotate-90': expanded })} />
        <span className="min-w-0">
          <strong className="block text-xs leading-snug font-medium text-accent max-md:text-xs">
            Run #{job.run_number}
            {!!(job.run_attempt && job.run_attempt > 1) && ` · attempt ${job.run_attempt}`}
          </strong>
          <span className="history-revision mt-1.25 flex min-w-0 items-center gap-1.75 text-xs text-muted">
            <BranchIcon className="size-3 shrink-0 text-muted" />
            <span
              className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap"
              title={job.branch || 'Unknown branch'}
            >
              {job.branch || 'Unknown branch'}
            </span>
            {!!job.head_sha && (
              <code className="ml-0.5 shrink-0 text-xs max-lg:hidden" title={job.head_sha}>
                {job.head_sha.slice(0, 7)}
              </code>
            )}
          </span>
        </span>
      </button>
      <span
        className={cn(
          'history-mobile-runner mr-0 mb-0 ml-5.25 hidden max-md:mt-1 max-md:block',
          'max-md:overflow-hidden max-md:text-xs max-md:text-ellipsis',
          'max-md:whitespace-nowrap max-md:text-muted',
        )}
        title={environment}
      >
        {runner}
      </span>
    </td>
  );
}
