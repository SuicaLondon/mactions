import type { Job } from '../../../../../shared/api/types';
import type { JobLogSource } from '../../types/job-log-source';
import { StepRow } from './StepRow';

export function JobCardSteps({ job, source }: { job: Job; source: JobLogSource }) {
  if (!job.steps.length) {
    return (
      <p className="m-0 p-5 text-xs text-muted">GitHub has not reported any steps for this job.</p>
    );
  }
  return (
    <ol className="m-0 list-none p-0">
      {job.steps.map((step) => (
        <StepRow key={step.number} job={job} step={step} source={source} />
      ))}
    </ol>
  );
}
