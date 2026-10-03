import {
  differenceInSeconds,
  getTime,
  hoursToSeconds,
  minutesToSeconds,
  secondsToHours,
  secondsToMinutes,
} from 'date-fns';

import type { Job } from '../api/types';
import { currentDate, parseTimestamp } from './date';

type StatusIconName = 'clock' | 'check' | 'close' | 'refresh' | 'cancel' | 'minus';

export function stateFor(status: string, conclusion: string | null) {
  const value = conclusion || status;
  let tone = 'neutral';
  let icon: StatusIconName = 'clock';
  switch (value) {
    case 'success':
      tone = 'success';
      icon = 'check';
      break;
    case 'failure':
    case 'timed_out':
    case 'action_required':
    case 'startup_failure':
      tone = 'failure';
      icon = 'close';
      break;
    case 'in_progress':
      tone = 'running';
      icon = 'refresh';
      break;
    case 'queued':
    case 'waiting':
    case 'pending':
    case 'requested':
      tone = 'queued';
      break;
    case 'cancelled':
      icon = 'cancel';
      break;
    case 'skipped':
      icon = 'minus';
      break;
  }
  let label = 'Running';
  if (value !== 'in_progress') {
    label = value.replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase());
  }
  return { tone, icon, label };
}

export function jobRunnerName(job: Pick<Job, 'runner_name' | 'runner_id' | 'status'>) {
  if (job.runner_name) return job.runner_name;
  if (job.runner_id) return `Runner #${job.runner_id}`;
  if (['queued', 'waiting', 'pending', 'requested'].includes(job.status)) return 'Unassigned';
  return 'Runner not reported';
}

export function duration(
  start?: string | null,
  end?: string | null,
  running = false,
  now = getTime(currentDate()),
) {
  if (!start || (!end && !running)) return '—';
  const started = parseTimestamp(start);
  let finished: Date | number | null = now;
  if (end) finished = parseTimestamp(end);
  if (!started || finished === null) return '—';
  const seconds = Math.max(0, differenceInSeconds(finished, started, { roundingMethod: 'floor' }));
  if (!Number.isFinite(seconds)) return '—';
  const hours = secondsToHours(seconds);
  const minutes = secondsToMinutes(seconds - hoursToSeconds(hours));
  const remainder = seconds - hoursToSeconds(hours) - minutesToSeconds(minutes);
  let formatted = '';
  if (hours) formatted += `${hours}h `;
  if (secondsToMinutes(seconds)) formatted += `${minutes}m `;
  return `${formatted}${remainder}s`;
}
