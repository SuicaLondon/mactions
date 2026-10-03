import type { JobSummary, WorkflowRun } from '../../../data/types/activity-types';
import { type useRunSelection } from '../../hooks/use-run-selection';
import { RunGraphOverview } from '../graph/RunGraphOverview';
import { type RunDetail } from './RunDetail';
import { SelectedJob } from './SelectedJob';

export function RunSelectedContent({
  selectedJob,
  run,
  selection,
  highlightRunnerId,
  onOpenHistory,
  onJobLoaded,
  select,
  current,
  jobs,
  selectJob,
}: {
  selectedJob: JobSummary | undefined;
  run: Parameters<typeof RunDetail>[0]['run'];
  selection: ReturnType<typeof useRunSelection>['selection'];
  highlightRunnerId: Parameters<typeof RunDetail>[0]['highlightRunnerId'];
  onOpenHistory: Parameters<typeof RunDetail>[0]['onOpenHistory'];
  onJobLoaded: ReturnType<typeof useRunSelection>['onJobLoaded'];
  select: ReturnType<typeof useRunSelection>['select'];
  current: WorkflowRun;
  jobs: JobSummary[];
  selectJob: ReturnType<typeof useRunSelection>['selectJob'];
}) {
  if (selectedJob)
    return (
      <SelectedJob
        key={`${run.repository}:${selectedJob.id}`}
        repository={run.repository}
        jobId={selectedJob.id}
        stepNumber={selection?.stepNumber}
        highlightRunnerId={highlightRunnerId}
        onOpenHistory={onOpenHistory}
        onLoaded={onJobLoaded}
        onSelectStep={(stepNumber) => select({ jobId: selectedJob.id, stepNumber })}
      />
    );
  return (
    <RunGraphOverview
      run={current}
      jobs={jobs}
      highlightRunnerId={highlightRunnerId}
      onSelect={selectJob}
    />
  );
}
