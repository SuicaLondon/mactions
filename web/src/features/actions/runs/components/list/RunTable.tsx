import { cn } from '../../../../../shared/lib/cn';
import type { WorkflowRun } from '../../../data/types/activity-types';
import { RunListItem } from './items/RunListItem';

export function RunTable({
  runs,
  onOpenRun,
}: {
  runs: WorkflowRun[];
  onOpenRun: (run: WorkflowRun) => void;
}) {
  return (
    <div className="workflow-runs-table-wrap overflow-hidden rounded-md border border-line">
      <table
        className="workflow-runs-table w-full table-fixed border-collapse px-3 text-xs"
        aria-label="Workflow runs"
      >
        <colgroup>
          <col />
          <col className="workflow-source-column w-1/4 max-lg:w-1/4 max-md:hidden" />
          <col className="workflow-result-column w-28 max-lg:w-26 max-md:w-23" />
          <col className="workflow-duration-column w-22 max-lg:w-19 max-md:w-17" />
          <col className="workflow-started-column w-24 max-lg:hidden" />
          <col className="workflow-link-column w-10.5 max-lg:w-9" />
        </colgroup>
        <thead>
          <tr>
            <th
              className={cn(
                'h-8 border-b border-b-line bg-toolbar py-1.5 text-left text-xs font-medium',
                'whitespace-nowrap text-muted max-lg:pr-2.25 max-lg:pl-2.25',
              )}
              scope="col"
            >
              Workflow run
            </th>
            <th
              scope="col"
              className={cn(
                'workflow-run-source h-8 border-b border-b-line bg-toolbar py-1.5 max-md:hidden',
                'text-left text-xs font-medium whitespace-nowrap text-muted max-lg:pr-2.25',
                'max-lg:pl-2.25',
              )}
            >
              Repository / branch
            </th>
            <th
              className={cn(
                'h-8 border-b border-b-line bg-toolbar py-1.5 text-left text-xs font-medium',
                'whitespace-nowrap text-muted max-lg:pr-2.25 max-lg:pl-2.25',
              )}
              scope="col"
            >
              Result
            </th>
            <th
              scope="col"
              className={cn(
                'workflow-run-duration h-8 border-b border-b-line bg-toolbar py-1.5 text-xs',
                'text-right font-medium text-muted max-lg:pr-2.25 max-lg:pl-2.25',
                'whitespace-nowrap tabular-nums',
              )}
            >
              Duration
            </th>
            <th
              scope="col"
              className={cn(
                'workflow-run-started h-8 border-b border-b-line tabular-nums max-lg:hidden',
                'bg-toolbar py-1.5 text-left text-xs font-medium whitespace-nowrap text-muted',
                'max-lg:pr-2.25 max-lg:pl-2.25',
              )}
            >
              Started
            </th>
            <th
              scope="col"
              className={cn(
                'workflow-run-link h-8 overflow-visible border-b border-b-line p-1 text-clip',
                'bg-toolbar py-1.5 text-left text-xs font-medium whitespace-nowrap text-muted',
                'max-lg:pr-2.25 max-lg:pl-2.25',
              )}
            >
              <span
                className={cn(
                  'workflow-table-visually-hidden absolute size-0.25 overflow-hidden',
                  'whitespace-nowrap',
                )}
              >
                GitHub
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <RunListItem
              key={`${run.repository}:${run.id}:${run.attempt}`}
              run={run}
              onOpen={onOpenRun}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
