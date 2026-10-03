import { duration, stateFor } from '../../../../../../shared/lib/activity-format';
import { cn } from '../../../../../../shared/lib/cn';
import { ChevronIcon } from '../../../../../../shared/ui/icons/navigation/ChevronIcon';
import { Status } from '../../../../shared/components/Status';
import { type JobWorkspaceDetail } from '../JobWorkspaceDetail';

export function JobStepsTable({
  job,
  onSelectStep,
}: {
  job: Parameters<typeof JobWorkspaceDetail>[0]['job'];
  onSelectStep: Parameters<typeof JobWorkspaceDetail>[0]['onSelectStep'];
}) {
  return (
    <table className="job-overview-steps w-full table-auto border-collapse text-xs">
      <caption
        className={cn(
          'border-t border-t-line px-0 pt-2.25 pb-1.75 text-left text-xs font-medium',
          'text-muted',
        )}
      >
        Steps in this job
      </caption>
      <thead className="static">
        <tr className="bg-transparent">
          <th
            className={cn(
              'table-cell h-auto border-b border-b-line bg-transparent px-0 py-1.75',
              'whitespace-normal text-muted first:w-2/3 last:text-right last:whitespace-nowrap',
              'last:tabular-nums',
            )}
            scope="col"
          >
            Step
          </th>
          <th
            className={cn(
              'table-cell h-auto border-b border-b-line bg-transparent px-0 py-1.75',
              'whitespace-normal text-muted first:w-2/3 last:text-right last:whitespace-nowrap',
              'last:tabular-nums',
            )}
            scope="col"
          >
            Result
          </th>
          <th
            className={cn(
              'table-cell h-auto border-b border-b-line bg-transparent px-0 py-1.75',
              'whitespace-normal text-muted first:w-2/3 last:text-right last:whitespace-nowrap',
              'last:tabular-nums',
            )}
            scope="col"
          >
            Duration
          </th>
        </tr>
      </thead>
      <tbody>
        {job.steps.map((item) => {
          const stepState = stateFor(item.status, item.conclusion);
          return (
            <tr className="bg-transparent" key={item.number}>
              <th
                className={cn(
                  'table-cell h-auto border-b border-b-line bg-transparent px-0 py-1.75 text-xs',
                  'font-normal whitespace-normal first:w-2/3 last:text-right last:whitespace-nowrap',
                  'text-foreground last:tabular-nums',
                )}
                scope="row"
              >
                <button
                  className={cn(
                    'flex min-h-6 w-full items-center justify-start gap-2 border-0 bg-transparent p-0',
                    'pr-2 text-left text-xs whitespace-normal text-foreground shadow-none',
                  )}
                  aria-label={`${item.name}, ${stepState.label}, ${duration(item.started_at, item.completed_at, item.status === 'in_progress')}`}
                  onClick={() => onSelectStep(item.number)}
                >
                  <span className="min-w-3.5 text-xs text-muted">{item.number}</span>
                  {item.name}
                  <ChevronIcon className="ml-auto size-3 shrink-0 text-muted" />
                </button>
              </th>
              <td
                className={cn(
                  'table-cell h-auto border-b border-b-line bg-transparent px-0 py-1.75',
                  'whitespace-normal text-muted last:text-right last:whitespace-nowrap',
                  'last:tabular-nums',
                )}
              >
                <Status status={item.status} conclusion={item.conclusion} />
              </td>
              <td
                className={cn(
                  'table-cell h-auto border-b border-b-line bg-transparent px-0 py-1.75',
                  'whitespace-normal text-muted last:text-right last:whitespace-nowrap',
                  'last:tabular-nums',
                )}
              >
                {duration(item.started_at, item.completed_at, item.status === 'in_progress')}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
