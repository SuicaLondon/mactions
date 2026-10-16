import type { WorkflowRun } from '../../../data/types/activity-types';
import { ActivityTable } from '../../../shared/components/table/ActivityTable';
import { activityTables } from '../../../shared/models/activity-tables';
import { RunListItem } from './RunListItem';

export function RunTable({
  runs,
  onOpenRun,
}: {
  runs: WorkflowRun[];
  onOpenRun: (run: WorkflowRun) => void;
}) {
  return (
    <ActivityTable layout={activityTables.runs}>
      {runs.map((run) => (
        <RunListItem
          key={`${run.repository}:${run.id}:${run.attempt}`}
          run={run}
          onOpen={onOpenRun}
        />
      ))}
    </ActivityTable>
  );
}
