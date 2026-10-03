import type { Runner } from '../../../../../shared/api/types';
import { cn } from '../../../../../shared/lib/cn';
import { JobCard } from '../../../../actions/jobs/components/card/JobCard';
import { WorkflowGraph } from '../../../../replay/components/graph/WorkflowGraph';
import type { RunnerActivityState } from '../../models/runner-activity';
import { RunnerJobsNotice } from './RunnerJobsNotice';

export function RunnerJobsResults({
  jobs,
  allJobs,
  runner,
  selectedJob,
  setSelectedJobId,
  repository,
}: {
  jobs: RunnerActivityState['jobs'];
  allJobs: RunnerActivityState['allJobs'];
  runner: Runner;
  selectedJob: RunnerActivityState['selectedJob'];
  setSelectedJobId: RunnerActivityState['setSelectedJobId'];
  repository: RunnerActivityState['repository'];
}) {
  if (jobs.error)
    return (
      <p
        className={cn(
          'error-message m-0 mx-0 rounded-md border border-red-500/20 bg-red-500/4 px-3',
          'py-2.5 text-xs leading-normal wrap-anywhere whitespace-pre-wrap text-danger',
        )}
      >
        {jobs.error.message}
      </p>
    );
  return (
    <>
      <RunnerJobsNotice jobs={jobs} />
      {!!(jobs.data?.jobs.length === 0 && !jobs.data.needs_repository) && (
        <p className="panel-empty m-0 grid flex-1 place-items-center p-5 text-muted">
          No jobs found.
        </p>
      )}
      {!!allJobs.length && (
        <>
          <div
            className={cn(
              'jobs-summary flex flex-wrap justify-between gap-x-4 gap-y-1.5 px-0 pt-0.5 pb-4',
              'text-xs wrap-anywhere text-muted',
            )}
          >
            <span>{jobs.data?.repository || runner.target.name}</span>
            <span>Updates every 30s</span>
          </div>
          <WorkflowGraph
            jobs={allJobs}
            selectedJobId={selectedJob?.id ?? null}
            onSelectJob={(id) => {
              setSelectedJobId((current) => {
                if (current === id) return null;
                return id;
              });
            }}
          />
          {!!selectedJob && (
            <JobCard
              key={`${runner.id}:${selectedJob.id}`}
              job={selectedJob}
              runnerId={runner.id}
              repository={jobs.data?.repository || repository || runner.target.name}
            />
          )}
          <p className="jobs-footnote mx-0 mt-3.5 mb-0.5 text-xs leading-relaxed text-muted">
            {jobs.data?.message ||
              'Recent jobs assigned to this runner. Open a job on GitHub for full output.'}
          </p>
        </>
      )}
    </>
  );
}
