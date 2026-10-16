import type { Job } from '../../../../shared/api/types';
import { jobRunnerName } from '../../../../shared/lib/activity-format';

type HostedJob = Pick<Job, 'runner_name' | 'runner_id' | 'status' | 'host_type' | 'device'>;

/** Where a job ran, such as "Self-hosted · This device", or why that is unknown. */
export function jobHostingLabel(job: HostedJob) {
  let runnerType = 'Unknown type';
  if (job.host_type === 'self-hosted') runnerType = 'Self-hosted';
  else if (job.host_type === 'github-hosted') runnerType = 'GitHub-hosted';
  let device = 'Unknown device';
  if (job.device === 'this_device') device = 'This device';
  else if (job.device === 'other_device') device = 'Other device';
  if (job.runner_name || job.runner_id) return `${runnerType} · ${device}`;
  if (jobRunnerName(job) === 'Unassigned') return 'Not assigned';
  return 'Not reported';
}
