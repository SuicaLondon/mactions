import { getTime } from 'date-fns';
import { useState } from 'react';

import { cn } from '../../../../shared/lib/cn';
import { currentDate } from '../../../../shared/lib/date';
import { groupRuns } from '../../models/workflow-graph';
import type { WorkflowGraphProps } from '../../types/workflow-graph';
import { WorkflowGraphHeading } from './WorkflowGraphHeading';
import { WorkflowRun } from './WorkflowRun';

export function WorkflowGraph({
  jobs,
  selectedJobId,
  onSelectJob,
  at: providedAt,
}: WorkflowGraphProps) {
  const [initialTime] = useState(() => getTime(currentDate()));
  const at = providedAt ?? initialTime;
  const runs = groupRuns(jobs);
  return (
    <section
      className={cn(
        'workflow-graph min-w-0 shrink-0 overflow-hidden rounded-lg border border-line',
        'bg-surface',
      )}
      aria-label="Workflow graph"
    >
      <WorkflowGraphHeading runCount={runs.length} jobCount={jobs.length} />
      <div
        className={cn(
          'workflow-graph-viewport max-h-87.5 scroll-p-4.5 overflow-auto overscroll-contain',
          'bg-canvas bg-grid-dots max-sm:max-h-72.5',
        )}
        tabIndex={0}
        aria-label="Workflow graph canvas"
      >
        <ul className="workflow-graph-runs m-0 min-w-130 list-none px-3 px-4.5 py-3 max-sm:py-2.5">
          {runs.map((run) => (
            <WorkflowRun
              key={run.key}
              run={run}
              selectedJobId={selectedJobId}
              onSelectJob={onSelectJob}
              at={at}
            />
          ))}
        </ul>
      </div>
    </section>
  );
}
