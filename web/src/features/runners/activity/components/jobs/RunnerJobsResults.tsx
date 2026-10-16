import type { Jobs } from '../../../../../shared/api/types';
import { cn } from '../../../../../shared/lib/cn';
import { ErrorState } from '../../../../../shared/ui/feedback/components/ErrorState';
import { UpdateFailedIndicator } from '../../../../../shared/ui/feedback/components/UpdateFailedIndicator';
import { JobCard } from '../../../../actions/jobs/components/card/JobCard';
import { WorkflowGraph } from '../../../../replay/components/graph/WorkflowGraph';
import { findSelectedJob } from '../../models/runner-jobs';
import { RunnerJobsSkeleton } from './RunnerJobsSkeleton';

interface RunnerJobsResultsProps {
  /** The latest jobs read; undefined until one succeeds. */
  data: Jobs | undefined;
  error: Error | null;
  retrying: boolean;
  onRetry: () => void;
  runnerId: number;
  /** Names the jobs' repository when the read does not. */
  fallbackRepository: string;
  selectedJobId: number | null;
  onSelectJob: (id: number) => void;
}

export function RunnerJobsResults({
  data,
  error,
  retrying,
  onRetry,
  runnerId,
  fallbackRepository,
  selectedJobId,
  onSelectJob,
}: RunnerJobsResultsProps) {
  if (error && !data) {
    return (
      <ErrorState
        title="Couldn't load runner jobs"
        error={error}
        retrying={retrying}
        onRetry={onRetry}
      />
    );
  }
  if (!data) return <RunnerJobsSkeleton />;
  // A failed 30s poll keeps the graph and open job; the failure shows beside the update note.
  // The indicator holds its space while hidden, so a failure never moves the empty-state text.
  const failure = <UpdateFailedIndicator error={error} retrying={retrying} onRetry={onRetry} />;
  if (data.needs_repository) {
    return (
      <p className="m-0 grid flex-1 place-items-center p-5 text-muted">
        Choose a repository to view jobs.
        {failure}
      </p>
    );
  }
  if (!data.jobs.length) {
    return (
      <p className="m-0 grid flex-1 place-items-center p-5 text-muted">
        No jobs found.
        {failure}
      </p>
    );
  }
  const selectedJob = findSelectedJob(data, selectedJobId);
  const repository = data.repository || fallbackRepository;
  let updateStatus = <span>Updates every 30s</span>;
  if (error) updateStatus = failure;
  return (
    <>
      <div
        className={cn(
          'flex flex-wrap justify-between gap-x-4 gap-y-1.5 px-0 pt-0.5 pb-4',
          'text-xs wrap-anywhere text-muted',
        )}
      >
        <span>{repository}</span>
        {updateStatus}
      </div>
      <WorkflowGraph
        jobs={data.jobs}
        selectedJobId={selectedJob?.id ?? null}
        onSelectJob={onSelectJob}
      />
      {!!selectedJob && (
        <JobCard
          key={`${runnerId}:${selectedJob.id}`}
          job={selectedJob}
          runnerId={runnerId}
          repository={repository}
        />
      )}
      <p className="mx-0 mt-3.5 mb-0.5 text-xs/relaxed text-muted">
        {data.message ||
          'Recent jobs assigned to this runner. Open a job on GitHub for full output.'}
      </p>
    </>
  );
}
