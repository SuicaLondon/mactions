import { JobLogs } from '../logs/JobLogs';
import { type StepRow } from './StepRow';

export function StepEmptyOutput({
  step,
  job,
  runnerId,
  repository,
  replay,
}: {
  step: Parameters<typeof StepRow>[0]['step'];
  job: Parameters<typeof StepRow>[0]['job'];
  runnerId: Parameters<typeof StepRow>[0]['runnerId'];
  repository: Parameters<typeof StepRow>[0]['repository'];
  replay: Parameters<typeof StepRow>[0]['replay'];
}) {
  if (step.status === 'queued' || step.status === 'pending' || step.conclusion === 'skipped') {
    let message = 'This step has not started yet.';
    if (step.conclusion === 'skipped') message = 'This step was skipped.';
    return (
      <p className="job-log-message m-0 px-4 py-3.5 text-xs leading-relaxed wrap-anywhere text-muted">
        {message}
      </p>
    );
  }
  return (
    <JobLogs job={job} step={step} runnerId={runnerId} repository={repository} replay={replay} />
  );
}
