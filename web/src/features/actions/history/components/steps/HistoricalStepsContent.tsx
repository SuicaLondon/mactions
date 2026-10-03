import type { Job } from '../../../../../shared/api/types';
import { duration } from '../../../../../shared/lib/activity-format';
import { cn } from '../../../../../shared/lib/cn';
import { Status } from '../../../shared/components/Status';

export function HistoricalStepsContent({ steps }: { steps: Job['steps'] }) {
  if (steps.length)
    return (
      <table className="history-steps table-auto border-collapse px-0 pb-1.75 text-xs">
        <caption className="px-0 pt-2.5 pb-1.75 text-left text-xs text-muted">
          Step results and duration
        </caption>
        <thead className="static">
          <tr className="bg-transparent">
            <th
              className={cn(
                'h-auto border-b border-line bg-transparent px-0 py-2 whitespace-normal',
                'text-muted first:w-3/5 last:text-right last:tabular-nums',
              )}
              scope="col"
            >
              Step
            </th>
            <th
              className={cn(
                'h-auto border-b border-line bg-transparent px-0 py-2 whitespace-normal',
                'text-muted first:w-3/5 last:text-right last:tabular-nums',
              )}
              scope="col"
            >
              Result
            </th>
            <th
              className={cn(
                'h-auto border-b border-line bg-transparent px-0 py-2 whitespace-normal',
                'text-muted first:w-3/5 last:text-right last:tabular-nums',
              )}
              scope="col"
            >
              Duration
            </th>
          </tr>
        </thead>
        <tbody>
          {steps.map((step) => (
            <tr className="bg-transparent" key={step.number}>
              <th
                className={cn(
                  'h-auto border-b border-line bg-transparent px-0 py-2 whitespace-normal',
                  'text-xs font-normal text-foreground first:w-3/5 last:text-right',
                  'last:tabular-nums',
                )}
                scope="row"
              >
                {step.name}
              </th>
              <td
                className={cn(
                  'h-auto border-b border-line bg-transparent px-0 py-2 whitespace-normal',
                  'text-muted first:w-3/5 last:text-right last:tabular-nums',
                )}
              >
                <Status compact status={step.status} conclusion={step.conclusion} />
              </td>
              <td
                className={cn(
                  'h-auto border-b border-line bg-transparent px-0 py-2 whitespace-normal',
                  'text-muted first:w-3/5 last:text-right last:tabular-nums',
                )}
              >
                {duration(step.started_at, step.completed_at, step.status === 'in_progress')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  return (
    <p className="panel-empty m-0 grid flex-1 place-items-center p-5 text-muted">
      No steps are available for this job.
    </p>
  );
}
