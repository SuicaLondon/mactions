import { cn } from '../../../../../shared/lib/cn';
import type { WorkflowRun } from '../../../data/types/activity-types';
import type { JobSummary } from '../../../data/types/activity-types';
import { HistoryItem } from './items/HistoryItem';

export function HistoryTable({
  jobs,
  repository,
  highlightRunnerId,
  onOpenRun,
  expanded,
  toggleJob,
}: {
  jobs: JobSummary[];
  repository: string;
  highlightRunnerId?: number;
  onOpenRun?: (run: WorkflowRun) => void;
  expanded: number[];
  toggleJob: (id: number, open: boolean) => void;
}) {
  return (
    <div className="job-history-table-wrap overflow-hidden rounded-md border border-line">
      <table
        className="job-history-table w-full table-fixed border-collapse px-3 text-xs"
        aria-label="Job execution history"
      >
        {/* Keep column tracks for expanded rows spanning all six columns. */}
        <colgroup>
          <col />
          <col className="history-runner-column w-1/4 max-md:collapse max-md:w-0" />
          <col className="history-result-column w-28 max-lg:w-26 max-md:w-23 max-sm:w-20" />
          <col className="history-duration-column w-22 max-lg:w-19 max-md:w-17 max-sm:w-15" />
          <col className="history-started-column w-24 max-lg:collapse max-lg:w-0" />
          <col className="history-open-column w-23.5 max-lg:w-22 max-md:w-18 max-sm:w-20" />
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
              Execution
            </th>
            <th
              scope="col"
              className={cn(
                'job-history-runner h-8 border-b border-b-line bg-toolbar py-1.5 max-md:invisible',
                'text-left text-xs font-medium whitespace-nowrap text-muted max-lg:pr-2.25',
                'max-lg:pl-2.25',
              )}
            >
              Runner
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
                'job-history-duration h-8 border-b border-b-line bg-toolbar py-1.5 text-xs',
                'text-right font-medium text-muted max-lg:pr-2.25 max-lg:pl-2.25',
                'whitespace-nowrap tabular-nums',
                'max-sm:px-1',
              )}
            >
              Duration
            </th>
            <th
              scope="col"
              className={cn(
                'job-history-started h-8 border-b border-b-line tabular-nums max-lg:invisible',
                'bg-toolbar py-1.5 text-left text-xs font-medium whitespace-nowrap text-muted',
                'max-lg:pr-2.25 max-lg:pl-2.25',
              )}
            >
              Started
            </th>
            <th
              scope="col"
              className={cn(
                'job-history-open h-8 border-b border-b-line bg-toolbar px-2.5 py-1.5 text-left',
                'text-xs font-medium whitespace-nowrap text-muted max-lg:pr-2.25 max-lg:pl-2.25',
              )}
            >
              Run
            </th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((item) => (
            <HistoryItem
              key={item.id}
              job={item}
              repository={repository}
              highlightRunnerId={highlightRunnerId}
              onOpenRun={onOpenRun}
              expanded={expanded.includes(item.id)}
              onToggle={(open) => toggleJob(item.id, open)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
