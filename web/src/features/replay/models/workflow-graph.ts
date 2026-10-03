import {
  differenceInSeconds,
  hoursToMinutes,
  isValid,
  minutesToSeconds,
  parseISO,
  secondsToHours,
  secondsToMinutes,
  toDate,
} from 'date-fns';

import type { Job } from '../../../shared/api/types';
import type { StatusIconName } from '../../../shared/ui/icons/status/status-icons';

export function jobState(job: Job) {
  const value = job.conclusion || job.status;
  let tone = 'neutral';
  if (value === 'success') tone = 'success';
  else if (['failure', 'timed_out', 'action_required', 'startup_failure'].includes(value)) {
    tone = 'failure';
  } else if (value === 'in_progress') tone = 'running';
  let icon: StatusIconName = 'clock';
  if (tone === 'success') icon = 'check';
  else if (tone === 'failure') icon = 'close';
  else if (tone === 'running') icon = 'refresh';
  else if (value === 'skipped') icon = 'minus';
  let label: string;
  if (value === 'in_progress') label = 'Running';
  else label = value.replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase());
  return { tone, icon, label };
}

export function elapsed(job: Job, at: number) {
  if (!job.started_at) return 'Not started';
  const started = parseISO(job.started_at);
  let ended: Date;
  if (job.completed_at) ended = parseISO(job.completed_at);
  else ended = toDate(at);
  if (!isValid(started) || !isValid(ended)) return '';
  const seconds = Math.max(0, differenceInSeconds(ended, started, { roundingMethod: 'floor' }));
  const minutes = secondsToMinutes(seconds);
  const hours = secondsToHours(seconds);
  if (hours) return `${hours}h ${minutes - hoursToMinutes(hours)}m`;
  if (minutes) return `${minutes}m ${seconds - minutesToSeconds(minutes)}s`;
  return `${seconds}s`;
}

export function groupRuns(jobs: Job[]) {
  const groups = new Map<string, Job[]>();
  for (const job of jobs) {
    const key = JSON.stringify([
      job.run_id ?? [job.workflow, job.run_number],
      job.run_attempt ?? 1,
    ]);
    const group = groups.get(key);
    if (group) group.push(job);
    else groups.set(key, [job]);
  }
  return [...groups.entries()]
    .map(([key, runJobs]) => ({
      key,
      jobs: runJobs.sort(
        (a, b) => Number(a.status === 'completed') - Number(b.status === 'completed'),
      ),
    }))
    .sort(
      (a, b) =>
        Number(a.jobs.every((job) => job.status === 'completed')) -
        Number(b.jobs.every((job) => job.status === 'completed')),
    );
}
