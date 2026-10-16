import type { Job } from '../../../../shared/api/types';
import { duration } from '../../../../shared/lib/activity-format';

/** One labelled fact in a job card's details list. */
export interface JobCardDetail {
  label: string;
  value: string;
}

/**
 * The facts a job card lists, in order, leaving out those GitHub did not report. A running job's
 * duration counts to `now`, which a replay sets to its playback time; it defaults to the clock.
 */
export function jobCardDetails(job: Job, now?: number): JobCardDetail[] {
  let actor: string | null = null;
  if (job.actor) actor = `@${job.actor}`;
  let triggeredBy: string | null = null;
  if (job.triggering_actor && job.triggering_actor !== job.actor) {
    triggeredBy = `@${job.triggering_actor}`;
  }
  let run = `#${job.run_number}`;
  if (job.run_attempt) run += ` · attempt ${job.run_attempt}`;
  let runnerType: string | null = null;
  if (job.host_type === 'self-hosted') runnerType = 'Self-hosted';
  else if (job.host_type === 'github-hosted') runnerType = 'GitHub-hosted';
  let device: string | null = null;
  if (job.device === 'this_device') device = 'This device';
  else if (job.device === 'other_device') device = 'Other device';
  const details: { label: string; value: string | null | undefined }[] = [
    { label: 'Trigger', value: job.event?.replaceAll('_', ' ') },
    { label: 'Actor', value: actor },
    { label: 'Triggered by', value: triggeredBy },
    { label: 'Run', value: run },
    {
      label: 'Duration',
      value: duration(job.started_at, job.completed_at, job.status === 'in_progress', now),
    },
    { label: 'Runner', value: job.runner_name },
    { label: 'Runner group', value: job.runner_group_name },
    { label: 'Runner type', value: runnerType },
    { label: 'Device', value: device },
  ];
  return details.filter((detail): detail is JobCardDetail => Boolean(detail.value));
}
