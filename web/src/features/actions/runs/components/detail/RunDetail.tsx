import type { Job } from '../../../../../shared/api/types';
import { cn } from '../../../../../shared/lib/cn';
import { WorkflowIcon } from '../../../../../shared/ui/icons/git/WorkflowIcon';
import { LoadingPlaceholder } from '../../../../../shared/ui/loading/components/LoadingPlaceholder';
import { useRun } from '../../../data/hooks/use-run';
import type { WorkflowRun } from '../../../data/types/activity-types';
import { useRunSelection } from '../../hooks/use-run-selection';
import { RunJobsContent } from './RunJobsContent';
import { RunSelectedContent } from './RunSelectedContent';
import { RunWorkspaceHeader } from './RunWorkspaceHeader';

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
  selection?: {
    jobId: number | null;
    stepNumber?: number;
  };
  onSelectionChange?: (selection: { jobId: number | null; stepNumber?: number }) => void;
}) {
  const query = useRun(run);
  const {
    selectJob,
    selection,
    expandedJobIds,
    loadedJobs,
    onJobLoaded,
    select,
    showOverview,
    toggle,
  } = useRunSelection({ initialJobId, initialStepNumber, controlledSelection, onSelectionChange });
  const current = query.data?.run ?? run;
  const jobs = query.data?.jobs ?? [];
  const selectedJob = jobs.find((job) => job.id === selection?.jobId);
  const completed = jobs.filter((job) => job.status === 'completed').length;
  const failed = jobs.filter((job) =>
    ['failure', 'timed_out'].includes(job.conclusion ?? ''),
  ).length;
  return (
    <section
      className="run-detail run-workspace flex h-full min-h-0 flex-col"
      aria-label={`Run details for ${current.name} #${current.number}`}
    >
      <RunWorkspaceHeader
        current={current}
        query={query}
        completed={completed}
        jobs={jobs}
        failed={failed}
      />
      {!!query.error && (
        <p
          className={cn(
            'error-message m-0 mx-0 rounded-md border border-red-500/20 bg-red-500/4 px-3',
            'py-2.5 text-xs leading-normal wrap-anywhere whitespace-pre-wrap text-danger',
          )}
          role="alert"
        >
          {query.error.message}
        </p>
      )}
      {!!(query.isPending && !query.error) && <LoadingPlaceholder kind="run" />}
      {!!query.data && (
        <div
          className={cn(
            'run-detail-layout grid min-h-0 flex-1 grid-cols-[--spacing(75)_minmax(0,_1fr)]',
            'max-lg:grid-cols-[--spacing(67.5)_minmax(0,_1fr)]',
            'max-sm:grid-cols-1 max-sm:grid-rows-[auto_minmax(0,_1fr)]',
          )}
        >
          <aside
            className={cn(
              'run-jobs min-w-0 overflow-auto border-r border-r-line bg-canvas px-0 py-2.5',
              'pb-2.5 max-sm:max-h-48 max-sm:border-r-0 max-sm:border-b max-sm:border-line',
            )}
            aria-label="Jobs in this run"
          >
            <div className={'run-jobs-heading flex flex-col pb-1.25'}>
              <button
                className={cn(
                  'run-overview-button mx-2 my-0 flex items-center justify-start gap-2 rounded-sm',
                  'border-0 bg-transparent px-2.5 py-1.75 text-xs text-muted shadow-none',
                  'aria-pressed:bg-accent/10 aria-pressed:text-accent',
                  {
                    selected: !selectedJob,
                  },
                )}
                aria-pressed={!selectedJob}
                onClick={showOverview}
              >
                <WorkflowIcon className="size-4" />
                Overview
              </button>
              <h3 className="m-0 px-3 pt-3.25 pb-1.25 text-xs font-medium text-muted">
                Jobs <span className="ml-1 text-xs font-normal">{jobs.length}</span>
              </h3>
            </div>
            <RunJobsContent
              jobs={jobs}
              loadedJobs={loadedJobs}
              selection={selection}
              expandedJobIds={expandedJobIds}
              highlightRunnerId={highlightRunnerId}
              select={select}
              toggle={toggle}
            />
          </aside>
          <div className="run-job-detail @container/job-detail min-w-0 overflow-auto">
            <RunSelectedContent
              selectedJob={selectedJob}
              run={run}
              selection={selection}
              highlightRunnerId={highlightRunnerId}
              onOpenHistory={onOpenHistory}
              onJobLoaded={onJobLoaded}
              select={select}
              current={current}
              jobs={jobs}
              selectJob={selectJob}
            />
          </div>
        </div>
      )}
    </section>
  );
}
