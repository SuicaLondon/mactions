import { type ReactNode } from 'react';

import { type Job } from '../../../../../shared/api/types';
import { cn } from '../../../../../shared/lib/cn';
import { ErrorState } from '../../../../../shared/ui/feedback/components/ErrorState';
import { useRun } from '../../../data/hooks/use-run';
import { type WorkflowRun } from '../../../data/types/activity-types';
import { JobTree } from '../../../jobs/components/tree/JobTree';
import { useExpandedRunJobs } from '../../hooks/use-expanded-run-jobs';
import { useLoadedRunJobs } from '../../hooks/use-loaded-run-jobs';
import { type RunSelection, useRunJobSelection } from '../../hooks/use-run-job-selection';
import { type RunProgress, runProgress } from '../../models/run-progress';
import { RunFailureCallout } from '../graph/RunFailureCallout';
import { RunGraphOverview } from '../graph/RunGraphOverview';
import { RunDetailSkeleton } from './RunDetailSkeleton';
import { RunJobsPanel } from './RunJobsPanel';
import { RunWorkspaceHeader } from './RunWorkspaceHeader';
import { SelectedJob } from './SelectedJob';

export function RunDetail({
  run,
  highlightRunnerId,
  onOpenHistory,
  initialJobId,
  initialStepNumber,
  selection: controlledSelection,
  onSelectionChange,
}: {
  run: WorkflowRun;
  highlightRunnerId?: number;
  onOpenHistory: (job: Job) => void;
  initialJobId?: number;
  initialStepNumber?: number;
  selection?: RunSelection;
  onSelectionChange?: (selection: RunSelection) => void;
}) {
  const query = useRun(run);
  let openedJobId = initialJobId;
  if (controlledSelection?.jobId) openedJobId = controlledSelection.jobId;
  const { expandedJobIds, expandJob, toggleJob } = useExpandedRunJobs(openedJobId);
  const { loadedJobs, onJobLoaded } = useLoadedRunJobs();
  // Selecting a Job also expands it in the Job tree.
  const { selection, select, selectJob, showOverview } = useRunJobSelection({
    initialJobId,
    initialStepNumber,
    controlledSelection,
    onSelectionChange,
    onSelect: expandJob,
  });
  const current = query.data?.run ?? run;
  const jobs = query.data?.jobs ?? [];
  const selectedJob = jobs.find((job) => job.id === selection?.jobId);
  const progress = runProgress(jobs);
  // Progress and refresh failures describe loaded jobs, so they wait for the first load.
  let shownProgress: RunProgress | null = null;
  let refreshError: Error | null = null;
  if (query.data) {
    shownProgress = progress;
    refreshError = query.error;
  }
  const refresh = () => void query.refetch();
  let jobList = (
    <p className="m-0 grid flex-1 place-items-center p-5 text-muted">
      GitHub has not reported any jobs for this run.
    </p>
  );
  if (jobs.length) {
    jobList = (
      <JobTree
        jobs={jobs}
        loadedJobs={loadedJobs}
        selected={selection}
        expandedJobIds={expandedJobIds}
        highlightRunnerId={highlightRunnerId}
        onSelect={select}
        onToggle={toggleJob}
      />
    );
  }
  let jobDetail = (
    <RunGraphOverview
      run={current}
      jobs={jobs}
      highlightRunnerId={highlightRunnerId}
      onSelect={selectJob}
    />
  );
  if (selectedJob) {
    jobDetail = (
      <SelectedJob
        key={`${run.repository}:${selectedJob.id}`}
        repository={run.repository}
        selection={{ jobId: selectedJob.id, stepNumber: selection?.stepNumber }}
        highlightRunnerId={highlightRunnerId}
        onOpenHistory={onOpenHistory}
        onLoaded={onJobLoaded}
        onSelect={select}
      />
    );
  }
  // A loaded run stays on screen when a refresh fails; the header reports that failure.
  let body: ReactNode = null;
  if (query.data) {
    body = (
      <div
        className={cn(
          'grid min-h-0 flex-1 grid-cols-run-jobs max-lg:grid-cols-run-jobs-compact',
          'max-md:flex-none max-md:grid-cols-1',
        )}
      >
        {/* Phones stack the Jobs list above Overview, so failures lead the run body there. */}
        {!selectedJob && (
          <RunFailureCallout jobs={jobs} onSelect={selectJob} className="md:hidden" />
        )}
        <RunJobsPanel
          jobCount={jobs.length}
          hasFailures={progress.failed > 0}
          selectedJobId={selectedJob?.id ?? null}
          onShowOverview={showOverview}
        >
          {jobList}
        </RunJobsPanel>
        <div
          className={cn('@container/job-detail min-w-0 overflow-auto', 'max-md:overflow-visible')}
        >
          {jobDetail}
        </div>
      </div>
    );
  } else if (query.error) {
    body = (
      <ErrorState
        title="Couldn't load this run"
        error={query.error}
        retrying={query.isFetching}
        onRetry={refresh}
      />
    );
  } else if (query.isPending) {
    body = <RunDetailSkeleton />;
  }
  return (
    <section
      className="flex h-full min-h-0 flex-col max-md:overflow-auto"
      aria-label={`Run details for ${current.name} #${current.number}`}
    >
      <RunWorkspaceHeader
        run={current}
        progress={shownProgress}
        refresh={{ error: refreshError, refreshing: query.isFetching, onRefresh: refresh }}
      />
      {body}
    </section>
  );
}
