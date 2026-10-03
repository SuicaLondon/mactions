import { type JobCard } from './JobCard';
import { StepRow } from './StepRow';

export function JobCardSteps({
  job,
  runnerId,
  repository,
  replay,
}: {
  job: Parameters<typeof JobCard>[0]['job'];
  runnerId: Parameters<typeof JobCard>[0]['runnerId'];
  repository: Parameters<typeof JobCard>[0]['repository'];
  replay: Parameters<typeof JobCard>[0]['replay'];
}) {
  if (job.steps.length)
    return (
      <ol className="job-step-list m-0 list-none p-0">
        {job.steps.map((step) => (
          <StepRow
            key={step.number}
            step={step}
            job={job}
            runnerId={runnerId}
            repository={repository}
            replay={replay}
          />
        ))}
      </ol>
    );
  return (
    <p className="job-steps-empty m-0 p-5 text-xs text-muted">
      GitHub has not reported any steps for this job.
    </p>
  );
}
