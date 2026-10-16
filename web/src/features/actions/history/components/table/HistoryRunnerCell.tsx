import { jobRunnerName } from '../../../../../shared/lib/activity-format';
import { cn } from '../../../../../shared/lib/cn';
import type { JobSummary } from '../../../data/types/activity-types';
import { historyEnvironment, historyEnvironmentLabel } from '../../models/history-item';
import { HistoryRunnerName } from './HistoryRunnerName';

export function HistoryRunnerCell({
  job,
  ranOnSelectedRunner,
  className,
}: {
  job: JobSummary;
  /** The execution ran on the runner the user came from. */
  ranOnSelectedRunner: boolean;
  /** The row tone. */
  className: string;
}) {
  return (
    <td
      className={cn(
        'table-cell h-16 border-0 border-t border-line',
        'max-md:invisible max-md:p-0',
        'py-2.25 align-middle text-foreground max-lg:px-2.25',
        className,
      )}
    >
      <span className="flex min-w-0 items-baseline leading-snug">
        <HistoryRunnerName name={jobRunnerName(job)} />
        {!!ranOnSelectedRunner && (
          <span className="ml-1.75 shrink-0 text-xs text-accent">Selected</span>
        )}
      </span>
      <span
        className={cn(
          'mt-1.25 block overflow-hidden text-xs text-ellipsis',
          'whitespace-nowrap text-muted',
        )}
        title={historyEnvironment(job)}
      >
        {historyEnvironmentLabel(job)}
      </span>
    </td>
  );
}
