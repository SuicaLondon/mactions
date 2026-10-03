import { type JobWorkspaceContent } from '../JobWorkspaceContent';
import { JobStepsTable } from './JobStepsTable';

export function JobOverviewSteps({
  job,
  onSelectStep,
}: {
  job: Parameters<typeof JobWorkspaceContent>[0]['job'];
  onSelectStep: Parameters<typeof JobWorkspaceContent>[0]['onSelectStep'];
}) {
  if (job.steps.length) return <JobStepsTable job={job} onSelectStep={onSelectStep} />;
  return (
    <p className="job-steps-empty m-0 p-5 text-xs text-muted">
      GitHub has not reported any steps for this job.
    </p>
  );
}
