import type { JobSummary } from '../../data/types/activity-types';
import { isFailed } from '../../shared/models/activity-status';

export interface RunProgress {
  total: number;
  completed: number;
  failed: number;
}

export function runProgress(jobs: JobSummary[]): RunProgress {
  return {
    total: jobs.length,
    completed: jobs.filter((job) => job.status === 'completed').length,
    failed: jobs.filter(isFailed).length,
  };
}

/** One progress phrase beside the conclusion badge, so counts never repeat the badge. */
export function runProgressLabel({ total, completed, failed }: RunProgress) {
  let noun = 'jobs';
  if (total === 1) noun = 'job';
  if (failed) return `${failed} of ${total} ${noun} failed`;
  if (completed < total) return `${completed}/${total} ${noun} done`;
  return `${total} ${noun}`;
}
