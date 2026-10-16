import { expect, it } from 'vitest';

import { parseTimestamp } from '../../../../shared/lib/date';
import { makeJobSummary } from '../../../../test/activity-fixtures';
import type { JobSummary } from '../../data/types/activity-types';
import { formatSummaryDuration, sortHistoryByStart, summarizeHistory } from './history-summary';

const base = makeJobSummary({
  host_type: 'self-hosted',
  device: 'this_device',
  started_at: '2026-09-30T01:00:00Z',
  completed_at: '2026-09-30T01:01:00Z',
});

function execution(id: number, overrides: Partial<JobSummary> = {}): JobSummary {
  return { ...base, id, ...overrides };
}

/** Summarizes executions without a status filter, so every one is shown. */
function summarizeAll(jobs: JobSummary[]) {
  return summarizeHistory(jobs, jobs, 'all');
}

it('summarizes an empty history without a rate or median', () => {
  expect(summarizeAll([])).toMatchObject({
    loaded: 0,
    failureRate: null,
    medianSeconds: null,
    latestFailure: null,
  });
});

it('reports a zero failure rate when every execution succeeded', () => {
  const summary = summarizeAll([
    execution(1),
    execution(2, { completed_at: '2026-09-30T01:03:00Z' }),
  ]);
  expect(summary).toMatchObject({
    completed: 2,
    succeeded: 2,
    failed: 0,
    other: 0,
    failureRate: 0,
    medianSeconds: 120,
    latestFailure: null,
  });
});

it('counts failures, other conclusions, and the latest failure in mixed history', () => {
  const summary = summarizeAll([
    execution(1, { completed_at: '2026-09-30T01:00:30Z' }),
    execution(2, { conclusion: 'failure', completed_at: '2026-09-30T01:05:00Z' }),
    execution(3, { conclusion: 'timed_out', completed_at: '2026-09-30T01:02:00Z' }),
    execution(4, { conclusion: 'cancelled' }),
    execution(5, { conclusion: 'skipped', started_at: null, completed_at: null }),
  ]);
  expect(summary).toMatchObject({
    loaded: 5,
    completed: 5,
    succeeded: 1,
    failed: 2,
    other: 2,
    failureRate: 40,
    medianSeconds: 90,
  });
  expect(summary.latestFailure).toEqual({
    jobId: 2,
    at: parseTimestamp('2026-09-30T01:05:00Z'),
    shown: true,
  });
});

it('counts executions the status filter hides and says whether the latest failure is shown', () => {
  const failure = execution(2, { conclusion: 'failure' });
  const loaded = [execution(1), failure];
  expect(summarizeAll(loaded)).toMatchObject({ filtered: false, latestFailure: { shown: true } });
  expect(summarizeHistory(loaded, [failure], 'failure')).toMatchObject({
    loaded: 2,
    filtered: true,
    latestFailure: { jobId: 2, shown: true },
  });
  expect(summarizeHistory(loaded, [loaded[0]], 'success')).toMatchObject({
    loaded: 2,
    filtered: true,
    failed: 1,
    latestFailure: { jobId: 2, shown: false },
  });
});

it('excludes running and queued executions from the failure rate', () => {
  const summary = summarizeAll([
    execution(1, { conclusion: 'failure' }),
    execution(2),
    execution(3, { status: 'in_progress', conclusion: null, completed_at: null }),
    execution(4, { status: 'queued', conclusion: null, started_at: null, completed_at: null }),
  ]);
  expect(summary).toMatchObject({
    loaded: 4,
    completed: 2,
    active: 2,
    failed: 1,
    failureRate: 50,
    medianSeconds: 60,
  });
});

it.each([
  [null, '—'],
  [42, '42s'],
  [192, '3m 12s'],
  [3_660, '1h 1m 0s'],
])('formats a %j s median like the Duration column: %s', (seconds, label) => {
  expect(formatSummaryDuration(seconds)).toBe(label);
});

it('orders executions newest first, placing a rerun attempt above the attempt it replaced', () => {
  const first = execution(1, {
    run_number: 585,
    run_attempt: 1,
    started_at: '2026-09-30T17:04:00Z',
  });
  const older = execution(2, { run_number: 584, started_at: '2026-09-30T16:00:00Z' });
  const rerun = execution(3, {
    run_number: 585,
    run_attempt: 2,
    started_at: '2026-09-30T17:08:00Z',
  });
  const queued = execution(4, { status: 'queued', conclusion: null, started_at: null });
  const loaded = [first, older, rerun, queued];
  expect(sortHistoryByStart(loaded).map((job) => job.id)).toEqual([4, 3, 1, 2]);
  expect(loaded.map((job) => job.id)).toEqual([1, 2, 3, 4]);
});
