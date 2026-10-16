import { type Job, type JobStep } from '../../../../../shared/api/types';
import { JobLogs } from '../logs/JobLogs';
import { JobMetadata } from './overview/JobMetadata';
import { JobOverviewSummary } from './overview/JobOverviewSummary';
import { JobStepsTable } from './overview/JobStepsTable';
import { WorkspaceStep } from './WorkspaceStep';

/**
 * The selected step's output, or the job overview: its progress, runner, optional full output,
 * and steps table.
 */
export function JobWorkspaceContent({
  job,
  step,
  repository,
  ranOnSelectedRunner,
  fullLogOpen,
  onSelectStep,
}: {
  job: Job;
  step: JobStep | undefined;
  repository: string;
  /** The job ran on the runner the page is showing. */
  ranOnSelectedRunner: boolean;
  fullLogOpen: boolean;
  onSelectStep: (number: number) => void;
}) {
  if (step)
    return <WorkspaceStep key={step.number} job={job} step={step} repository={repository} />;
  return (
    <>
      <JobOverviewSummary job={job} onSelectStep={onSelectStep} />
      <JobMetadata job={job} ranOnSelectedRunner={ranOnSelectedRunner} />
      {!!fullLogOpen && (
        <section id={`job-${job.id}-full-log`} aria-label="Full job output">
          <JobLogs job={job} source={{ repository }} />
        </section>
      )}
      <JobStepsTable job={job} onSelectStep={onSelectStep} />
    </>
  );
}
