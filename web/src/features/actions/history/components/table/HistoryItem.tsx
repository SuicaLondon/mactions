import { duration } from '../../../../../shared/lib/activity-format';
import { cn } from '../../../../../shared/lib/cn';
import { type JobSummary, type WorkflowRun } from '../../../data/types/activity-types';
import { Status } from '../../../shared/components/Status';
import { Timestamp } from '../../../shared/components/Timestamp';
import { HistoryExecutionCell } from './HistoryExecutionCell';
import { HistoryRunLink } from './HistoryRunLink';
import { HistoryRunnerCell } from './HistoryRunnerCell';

/** One execution's row; its expanded steps row is rendered after it by the table. */
export function HistoryItem({
  job,
  ranOnSelectedRunner,
  current = false,
  expanded,
  onToggle,
  onOpenRun,
}: {
  job: JobSummary;
  /** The execution ran on the runner the user came from. */
  ranOnSelectedRunner: boolean;
  /** Marks the execution the user opened history from. */
  current?: boolean;
  expanded: boolean;
  onToggle: (expanded: boolean) => void;
  onOpenRun?: (run: WorkflowRun) => void;
}) {
  // The current execution keeps its tint instead of the fainter hover tint.
  const tone = cn({
    'bg-accent/3': current,
    'bg-surface group-hover/history:bg-accent/5': !current,
    'group-focus-within/history:bg-accent/5': !current,
  });
  return (
    <tr
      data-selected-runner={ranOnSelectedRunner || undefined}
      className="group/history px-3"
      aria-current={current || undefined}
    >
      <HistoryExecutionCell
        job={job}
        current={current}
        ranOnSelectedRunner={ranOnSelectedRunner}
        expanded={expanded}
        onToggle={onToggle}
        className={tone}
      />
      <HistoryRunnerCell job={job} ranOnSelectedRunner={ranOnSelectedRunner} className={tone} />
      <td
        className={cn(
          'table-cell h-16 border-0 border-t border-line',
          'py-1.75 align-middle text-foreground max-lg:px-2.25',
          'max-md:invisible max-md:p-0',
          tone,
        )}
      >
        <Status compact status={job.status} conclusion={job.conclusion} />
      </td>
      <td
        className={cn(
          'table-cell h-16 border-0 border-t border-line',
          'px-3 py-2.25 align-middle text-foreground',
          'text-right max-lg:px-2.25',
          'whitespace-nowrap tabular-nums',
          'max-md:invisible max-md:p-0',
          tone,
        )}
      >
        {duration(job.started_at, job.completed_at, job.status === 'in_progress')}
      </td>
      <td
        className={cn(
          'table-cell h-16 border-0 border-t border-line',
          'max-lg:invisible',
          'px-3 py-2.25 align-middle',
          'text-xs text-muted max-lg:px-2.25 max-md:p-0',
          'tabular-nums',
          tone,
        )}
      >
        <Timestamp value={job.started_at} format="short" />
      </td>
      <td
        className={cn(
          'table-cell h-16 border-0 border-t border-line px-2.5',
          'py-1.75 align-middle text-foreground max-lg:px-2.25',
          'max-sm:px-1',
          tone,
        )}
      >
        <HistoryRunLink job={job} onOpenRun={onOpenRun} />
      </td>
    </tr>
  );
}
