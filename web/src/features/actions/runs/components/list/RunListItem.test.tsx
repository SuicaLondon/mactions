import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

import { makeRun } from '../../../../../test/activity-fixtures';
import type { WorkflowRun } from '../../../data/types/activity-types';
import { RunListItem } from './RunListItem';

const run = makeRun({
  number: 585,
  attempt: 2,
  created_at: '2026-09-30T01:00:00Z',
  started_at: '2026-09-30T01:00:00Z',
  updated_at: '2026-09-30T01:02:00Z',
});

function renderRow(overrides: Partial<WorkflowRun> = {}) {
  render(
    <table>
      <tbody>
        <RunListItem run={{ ...run, ...overrides }} onOpen={vi.fn()} />
      </tbody>
    </table>,
  );
}

it('identifies a run by title, workflow, attempt, commit, result and duration', () => {
  renderRow({ conclusion: 'failure' });
  expect(screen.getByText('Improve build')).toBeVisible();
  expect(screen.getByText('CI')).toBeVisible();
  expect(screen.getByText('#585 · attempt 2')).toBeVisible();
  expect(screen.getByText('abcdef1')).toHaveAttribute('title', 'abcdef1');
  // The Result column and the phone-only first-line badge.
  expect(screen.getAllByText('Failure')).toHaveLength(2);
  expect(screen.getByText('2m 0s')).toBeVisible();
  expect(screen.getByRole('link', { name: 'View run #585 on GitHub' })).toHaveAttribute(
    'href',
    run.url,
  );
});

it.each([
  [
    'a scheduled run without its own title by its trigger',
    { title: 'CI', event: 'schedule' },
    'Scheduled',
  ],
  ['a run with a title by that title', { event: 'push' }, 'Improve build'],
])('labels %s', (_case, overrides, label) => {
  renderRow(overrides);
  expect(screen.getByText(label)).toBeVisible();
  expect(screen.queryByText('Push')).not.toBeInTheDocument();
});

it('does not repeat the workflow name when it is also the run title', () => {
  renderRow({ title: 'CI', attempt: 1 });
  expect(screen.getAllByText('CI')).toHaveLength(1);
  expect(screen.getByText('#585')).toBeVisible();
});

it('gives phones the branch and start time on one line', () => {
  renderRow();
  const meta = screen.getByTitle('example/app · main');
  expect(meta).toHaveTextContent(/^main·.+/);
  expect(meta.querySelector('time')).toHaveAttribute('dateTime', run.started_at);
  for (const time of document.querySelectorAll('time')) {
    expect(time.children).toHaveLength(0);
    expect(time.textContent).toMatch(/^\S.*, \d{2}:\d{2}/);
  }
});

it('leaves the start time out of the phone line before a run starts', () => {
  renderRow({ started_at: null, branch: '' });
  const meta = screen.getByTitle('example/app · Unknown branch');
  expect(meta).toHaveTextContent(/^Unknown branch$/);
  expect(meta.querySelector('time')).toBeNull();
});
