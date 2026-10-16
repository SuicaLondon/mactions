import {
  differenceInSeconds,
  hoursToSeconds,
  minutesToSeconds,
  secondsToHours,
  secondsToMinutes,
} from 'date-fns';

import { stateFor } from '../../../../shared/lib/activity-format';
import { parseTimestamp } from '../../../../shared/lib/date';
import type { JobSummary } from '../../data/types/activity-types';

export interface HistorySummary {
  /** Every loaded execution, including queued and running ones. */
  loaded: number;
  /** A status filter hides some executions from the table; the counts still cover them all. */
  filtered: boolean;
  /** Executions GitHub reports as completed; the failure-rate denominator. */
  completed: number;
  succeeded: number;
  failed: number;
  /** Completed executions that neither succeeded nor failed, such as cancelled or skipped. */
  other: number;
  /** Loaded executions that have not completed and are excluded from the rate. */
  active: number;
  /** Whole-number failure percentage of completed executions, or null without any. */
  failureRate: number | null;
  /** Median elapsed seconds of completed executions with both timestamps. */
  medianSeconds: number | null;
  /**
   * The most recently finished failed execution, and whether the status filter leaves its row in
   * the table to reveal.
   */
  latestFailure: { jobId: number; at: Date; shown: boolean } | null;
}

function elapsedSeconds(job: JobSummary) {
  const started = parseTimestamp(job.started_at);
  const finished = parseTimestamp(job.completed_at);
  if (!started || !finished) return null;
  return Math.max(0, differenceInSeconds(finished, started, { roundingMethod: 'floor' }));
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2) return sorted[middle];
  return Math.floor((sorted[middle - 1] + sorted[middle]) / 2);
}

/**
 * Summarizes every loaded execution in `jobs`, whatever the status filter. `shown` holds the
 * executions the filter leaves in the table.
 */
export function summarizeHistory(
  jobs: JobSummary[],
  shown: JobSummary[],
  statusFilter: string,
): HistorySummary {
  const durations: number[] = [];
  let completed = 0;
  let succeeded = 0;
  let failed = 0;
  let latest: { jobId: number; at: Date } | null = null;
  for (const job of jobs) {
    if (job.status !== 'completed') continue;
    completed += 1;
    const seconds = elapsedSeconds(job);
    if (seconds !== null) durations.push(seconds);
    const { tone } = stateFor(job.status, job.conclusion);
    if (tone === 'success') succeeded += 1;
    if (tone !== 'failure') continue;
    failed += 1;
    const at = parseTimestamp(job.completed_at) ?? parseTimestamp(job.started_at);
    if (!at) continue;
    if (!latest || at > latest.at) latest = { jobId: job.id, at };
  }
  let failureRate: number | null = null;
  if (completed) failureRate = Math.round((failed / completed) * 100);
  let latestFailure: HistorySummary['latestFailure'] = null;
  if (latest) {
    const { jobId } = latest;
    latestFailure = { ...latest, shown: shown.some((job) => job.id === jobId) };
  }
  return {
    loaded: jobs.length,
    filtered: statusFilter !== 'all',
    completed,
    succeeded,
    failed,
    other: completed - succeeded - failed,
    active: jobs.length - completed,
    failureRate,
    medianSeconds: median(durations),
    latestFailure,
  };
}

/** Formats elapsed seconds like the history Duration column, for example `3m 12s`. */
export function formatSummaryDuration(seconds: number | null) {
  if (seconds === null) return '—';
  const hours = secondsToHours(seconds);
  const minutes = secondsToMinutes(seconds - hoursToSeconds(hours));
  const remainder = seconds - hoursToSeconds(hours) - minutesToSeconds(minutes);
  let formatted = '';
  if (hours) formatted += `${hours}h `;
  if (secondsToMinutes(seconds)) formatted += `${minutes}m `;
  return `${formatted}${remainder}s`;
}

/** DOM id of an execution's expand control, used to reveal it from the summary. */
export function historyExpandId(jobId: number) {
  return `history-expand-${jobId}`;
}

function startedAt(job: JobSummary) {
  return parseTimestamp(job.started_at)?.getTime() ?? Number.POSITIVE_INFINITY;
}

/**
 * Orders executions newest first by start time, so a rerun attempt sits above the attempt
 * it replaced. Executions that have not started yet are the newest and lead the list; ties
 * keep GitHub's order.
 */
export function sortHistoryByStart(jobs: JobSummary[]) {
  return [...jobs].sort((left, right) => startedAt(right) - startedAt(left));
}
