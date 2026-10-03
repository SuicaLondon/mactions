import type { JobSummary } from '../../../data/types/activity-types';
import { JobTree } from '../../../jobs/components/tree/JobTree';
import { type useRunSelection } from '../../hooks/use-run-selection';
import { type RunDetail } from './RunDetail';

export function RunJobsContent({
  jobs,
  loadedJobs,
  selection,
  expandedJobIds,
  highlightRunnerId,
  select,
  toggle,
}: {
  jobs: JobSummary[];
  loadedJobs: ReturnType<typeof useRunSelection>['loadedJobs'];
  selection: ReturnType<typeof useRunSelection>['selection'];
  expandedJobIds: ReturnType<typeof useRunSelection>['expandedJobIds'];
  highlightRunnerId: Parameters<typeof RunDetail>[0]['highlightRunnerId'];
  select: ReturnType<typeof useRunSelection>['select'];
  toggle: ReturnType<typeof useRunSelection>['toggle'];
}) {
  if (jobs.length)
    return (
      <JobTree
        jobs={jobs}
        loadedJobs={loadedJobs}
        selected={selection}
        expandedJobIds={expandedJobIds}
        highlightRunnerId={highlightRunnerId}
        onSelect={select}
        onToggle={toggle}
      />
    );
  return (
    <p className="panel-empty m-0 grid flex-1 place-items-center p-5 text-muted">
      GitHub has not reported any jobs for this run.
    </p>
  );
}
