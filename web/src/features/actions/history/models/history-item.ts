import { jobRunnerName } from '../../../../shared/lib/activity-format';
import type { JobSummary } from '../../data/types/activity-types';

/** Where an execution ran, such as "Self-hosted · This device"; empty when unreported. */
export function historyEnvironment(job: Pick<JobSummary, 'host_type' | 'device'>) {
  const labels: string[] = [];
  if (job.host_type === 'self-hosted') labels.push('Self-hosted');
  else if (job.host_type === 'github-hosted') labels.push('GitHub-hosted');
  if (job.device === 'this_device') labels.push('This device');
  else if (job.device === 'other_device') labels.push('Other device');
  return labels.join(' · ');
}

/** The environment line under a runner name, explaining an unreported environment. */
export function historyEnvironmentLabel(job: JobSummary) {
  const environment = historyEnvironment(job);
  if (environment) return environment;
  if (jobRunnerName(job) === 'Unassigned') return 'Awaiting assignment';
  return 'Environment not reported';
}

/** The accessible name of an execution's expand button. */
export function historyExpandLabel(job: Pick<JobSummary, 'name' | 'run_number' | 'run_attempt'>) {
  let label = `Expand ${job.name} run #${job.run_number}`;
  if (job.run_attempt) label += ` attempt ${job.run_attempt}`;
  return label;
}
