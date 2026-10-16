import { Fragment } from 'react';

import { type JobSummary, type WorkflowRun } from '../../../data/types/activity-types';
import { ActivityTable } from '../../../shared/components/table/ActivityTable';
import { activityTables } from '../../../shared/models/activity-tables';
import { ranOnRunner } from '../../../shared/models/job-runner';
import { HistoryItem } from './HistoryItem';
import { HistoryItemSteps } from './steps/HistoryItemSteps';

export function HistoryTable({
  jobs,
  repository,
  highlightRunnerId,
  currentJobId,
  onOpenRun,
  expanded,
  toggleJob,
}: {
  jobs: JobSummary[];
  repository: string;
  highlightRunnerId?: number;
  /** The execution the user opened history from, marked as current. */
  currentJobId?: number;
  onOpenRun?: (run: WorkflowRun) => void;
  expanded: number[];
  toggleJob: (id: number, open: boolean) => void;
}) {
  return (
    <ActivityTable layout={activityTables.history} className="bg-surface">
      {jobs.map((item) => (
        <Fragment key={item.id}>
          <HistoryItem
            job={item}
            ranOnSelectedRunner={ranOnRunner(item, highlightRunnerId)}
            current={item.id === currentJobId}
            expanded={expanded.includes(item.id)}
            onToggle={(open) => toggleJob(item.id, open)}
            onOpenRun={onOpenRun}
          />
          {expanded.includes(item.id) && <HistoryItemSteps job={item} repository={repository} />}
        </Fragment>
      ))}
    </ActivityTable>
  );
}
