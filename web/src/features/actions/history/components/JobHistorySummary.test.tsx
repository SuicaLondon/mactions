import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';

import { makeJobSummary } from '../../../../test/activity-fixtures';
import type { JobSummary } from '../../data/types/activity-types';
import { historyExpandId, summarizeHistory } from '../models/history-summary';
import { JobHistorySummary } from './JobHistorySummary';

const base = makeJobSummary({
  started_at: '2026-09-30T01:00:00Z',
  completed_at: '2026-09-30T01:01:00Z',
});
const jobs: JobSummary[] = [
  base,
  { ...base, id: 2, conclusion: 'failure', completed_at: '2026-09-30T01:03:00Z' },
  { ...base, id: 3, conclusion: 'cancelled' },
  { ...base, id: 4, status: 'in_progress', conclusion: null, completed_at: null },
];

function summary() {
  return within(screen.getByRole('group', { name: 'Summary of loaded executions' }));
}

it('explains the search in the same line and counts elapsed seconds once it runs long', () => {
  vi.useFakeTimers();
  try {
    render(<JobHistorySummary loading summary={summarizeHistory([], [], 'all')} />);
    expect(screen.getByRole('group', { name: 'Summary of loaded executions' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
    act(() => vi.advanceTimersByTime(4000));
    expect(summary().getByText('Searching recent runs for this job…')).toBeVisible();
    act(() => vi.advanceTimersByTime(8000));
    expect(summary().getByText('Still searching GitHub for runs… (12s)')).toBeVisible();
  } finally {
    vi.useRealTimers();
  }
});

it('summarizes every loaded execution and reveals the latest failure', async () => {
  render(
    <>
      <JobHistorySummary loading={false} summary={summarizeHistory(jobs, jobs, 'all')} />
      <button id={historyExpandId(2)}>Expand run #2</button>
    </>,
  );
  expect(summary().getByText('4 loaded')).toBeVisible();
  expect(summary().getByText('1 failed (33%)')).toBeVisible();
  expect(summary().getByText('median 1m 0s')).toBeVisible();
  expect(summary().queryByText('3 completed')).not.toBeInTheDocument();
  // Secondary counts move to the tooltip and screen-reader text.
  const breakdown = '1 succeeded, 1 cancelled or other, 1 in progress';
  expect(summary().getByText(breakdown)).toBeInTheDocument();
  expect(summary().getByTitle(new RegExp(`^${breakdown}\\.`))).toBeVisible();
  await userEvent.click(summary().getByRole('button', { name: /^Show last failure/ }));
  expect(screen.getByRole('button', { name: 'Expand run #2' })).toHaveFocus();
});

it('ignores the status filter and leaves a hidden failure as plain text', () => {
  const successes = jobs.filter((job) => job.conclusion === 'success');
  render(
    <JobHistorySummary loading={false} summary={summarizeHistory(jobs, successes, 'success')} />,
  );
  expect(summary().getByText('4 loaded, all statuses')).toBeVisible();
  expect(summary().getByText('1 failed (33%)')).toBeVisible();
  expect(summary().queryByRole('button')).not.toBeInTheDocument();
  expect(summary().getByText(/^last failure/)).toBeVisible();
});

it('reports no failures without a rate when nothing has completed', () => {
  render(
    <JobHistorySummary loading={false} summary={summarizeHistory([jobs[3]], [jobs[3]], 'all')} />,
  );
  expect(summary().getByText('1 loaded')).toBeVisible();
  expect(summary().getByText('0 failed')).toBeVisible();
  expect(summary().getByText('median —')).toBeVisible();
  expect(summary().getByText('no failures')).toBeVisible();
});
