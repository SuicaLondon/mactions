import { duration, jobRunnerName } from '../../../../../../shared/lib/activity-format';
import { cn } from '../../../../../../shared/lib/cn';
import { parseTimestamp } from '../../../../../../shared/lib/date';
import { jobRun } from '../../../../data/models/activity-data';
import type { JobSummary, WorkflowRun } from '../../../../data/types/activity-types';
import { Status } from '../../../../shared/components/Status';
import { HistoricalSteps } from '../../steps/HistoricalSteps';
import { HistoryExecutionCell } from './HistoryExecutionCell';
import { HistoryRunLink } from './HistoryRunLink';
import { HistoryTimestamp } from './HistoryTimestamp';

export function HistoryItem({
  job,
  repository,
  highlightRunnerId,
  onOpenRun,
  expanded,
  onToggle,
}: {
  job: JobSummary;
  repository: string;
  highlightRunnerId?: number;
  onOpenRun?: (run: WorkflowRun) => void;
  expanded: boolean;
  onToggle: (expanded: boolean) => void;
}) {
  const run = jobRun(job);
  const selectedRunner = highlightRunnerId !== undefined && job.runner_id === highlightRunnerId;
  const runner = jobRunnerName(job);
  const environmentLabels: string[] = [];
  if (job.host_type === 'self-hosted') environmentLabels.push('Self-hosted');
  else if (job.host_type === 'github-hosted') environmentLabels.push('GitHub-hosted');
  if (job.device === 'this_device') environmentLabels.push('This device');
  else if (job.device === 'other_device') environmentLabels.push('Other device');
  const environment = environmentLabels.join(' · ');
  const started = parseTimestamp(job.started_at);
  let expandLabel = `Expand ${job.name} run #${job.run_number}`;
  if (job.run_attempt) expandLabel += ` attempt ${job.run_attempt}`;
  let environmentLabel = environment;
  if (!environmentLabel) {
    environmentLabel = 'Environment not reported';
    if (runner === 'Unassigned') environmentLabel = 'Awaiting assignment';
  }
  return (
    <>
      <tr
        className={cn('job-history-row group/history px-3', {
          'assigned-to-selected-runner': selectedRunner,
        })}
      >
        <HistoryExecutionCell
          job={job}
          selectedRunner={selectedRunner}
          expanded={expanded}
          expandLabel={expandLabel}
          onToggle={onToggle}
          environment={environment}
          runner={runner}
        />
        <td
          className={cn(
            'job-history-runner table-cell h-16 border-0 border-t border-line',
            'max-md:invisible',
            'bg-surface py-2.25 align-middle text-foreground group-hover/history:bg-accent/5',
            'group-focus-within/history:bg-accent/5 max-lg:pr-2.25 max-lg:pl-2.25',
          )}
        >
          <span
            className={cn(
              'history-runner-name block overflow-hidden leading-snug text-ellipsis',
              'whitespace-nowrap',
            )}
            title={runner}
          >
            {runner}
            {!!selectedRunner && (
              <span className="history-runner-selected ml-1.75 text-xs text-accent">Selected</span>
            )}
          </span>
          <span
            className={cn(
              'history-runner-environment mt-1.25 block overflow-hidden text-xs text-ellipsis',
              'whitespace-nowrap text-muted',
            )}
            title={environment}
          >
            {environmentLabel}
          </span>
        </td>
        <td
          className={cn(
            'job-history-result table-cell h-16 border-0 border-t border-line bg-surface',
            'py-1.75 align-middle text-foreground group-hover/history:bg-accent/5',
            'group-focus-within/history:bg-accent/5 max-lg:pr-2.25 max-lg:pl-2.25',
            'max-sm:px-1',
          )}
        >
          <Status compact status={job.status} conclusion={job.conclusion} />
        </td>
        <td
          className={cn(
            'job-history-duration table-cell h-16 border-0 border-t border-line bg-surface',
            'px-3 py-2.25 align-middle text-foreground group-focus-within/history:bg-accent/5',
            'text-right group-hover/history:bg-accent/5 max-lg:pr-2.25 max-lg:pl-2.25',
            'whitespace-nowrap tabular-nums',
            'max-sm:px-1',
          )}
        >
          {duration(job.started_at, job.completed_at, job.status === 'in_progress')}
        </td>
        <td
          className={cn(
            'job-history-started table-cell h-16 border-0 border-t border-line',
            'max-lg:invisible',
            'bg-surface px-3 py-2.25 align-middle group-focus-within/history:bg-accent/5',
            'text-xs text-muted group-hover/history:bg-accent/5 max-lg:pr-2.25 max-lg:pl-2.25',
            'tabular-nums',
          )}
        >
          <HistoryTimestamp started={started} job={job} />
        </td>
        <td
          className={cn(
            'job-history-open table-cell h-16 border-0 border-t border-line bg-surface px-2.5',
            'py-1.75 align-middle text-foreground group-hover/history:bg-accent/5',
            'group-focus-within/history:bg-accent/5 max-lg:pr-2.25 max-lg:pl-2.25',
            'max-sm:px-1',
          )}
        >
          <HistoryRunLink run={run} onOpenRun={onOpenRun} job={job} />
        </td>
      </tr>
      {!!expanded && (
        <tr className="job-history-expanded">
          <td className="table-cell h-auto bg-surface p-0 whitespace-normal" colSpan={6}>
            <div
              id={`history-job-${job.id}`}
              className="history-expanded-content pt-0.5 pr-4.5 pb-3 pl-8.25 max-md:pr-3 max-md:pl-3"
              role="region"
              aria-label={`Steps for run #${job.run_number}`}
            >
              <HistoricalSteps repository={repository} jobId={job.id} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
