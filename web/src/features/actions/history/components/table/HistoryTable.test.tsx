import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { expect, it, vi } from 'vitest';

import { makeJobSummary } from '../../../../../test/activity-fixtures';
import type { JobSummary } from '../../../data/types/activity-types';
import { HistoryTable } from './HistoryTable';

const base = makeJobSummary({
  run_number: 589,
  runner_id: 11,
  runner_name: 'build-mac-pro-9',
  host_type: 'self-hosted',
  device: 'this_device',
  started_at: '2026-09-30T01:00:00Z',
  completed_at: '2026-09-30T01:01:00Z',
});
const jobs: JobSummary[] = [
  base,
  { ...base, id: 2, run_number: 590, run_id: 101, runner_name: 'mini' },
];

function row(runNumber: number) {
  return screen
    .getByRole('button', { name: `Expand Build run #${runNumber} attempt 1` })
    .closest('tr')!;
}
function renderTable(props: Partial<ComponentProps<typeof HistoryTable>> = {}) {
  render(
    <HistoryTable
      jobs={jobs}
      repository="example/app"
      expanded={[]}
      toggleJob={vi.fn()}
      {...props}
    />,
  );
}

it('keeps the full runner name available and repeats result and duration for phones', () => {
  renderTable();
  // The desktop column and the mobile line both carry the full name.
  expect(within(row(589)).getAllByTitle(/^build-mac-pro-9/)).toHaveLength(2);
  expect(within(row(589)).getAllByText('-pro-9')).toHaveLength(2);
  expect(within(row(590)).getAllByText('mini')).toHaveLength(2);
  expect(within(row(590)).getAllByText('1m 0s')).toHaveLength(2);
  expect(within(row(590)).getAllByText('Success')).toHaveLength(2);
});

it('offers one open action per row named with its run number', async () => {
  const open = vi.fn();
  renderTable({ onOpenRun: open });
  expect(within(row(590)).getAllByRole('button')).toHaveLength(2);
  await userEvent.click(within(row(590)).getByRole('button', { name: 'Open run #590' }));
  expect(open).toHaveBeenCalledWith(expect.objectContaining({ id: 101, number: 590 }));
});

it('links to GitHub with the run number when runs cannot open in place', () => {
  renderTable();
  expect(within(row(589)).getByRole('link', { name: 'Open run #589 on GitHub' })).toHaveAttribute(
    'href',
    base.run_url,
  );
});

it('marks the execution the user came from as current', () => {
  renderTable({ currentJobId: 2 });
  expect(row(590)).toHaveAttribute('aria-current', 'true');
  expect(within(row(590)).getByText('Current')).toBeVisible();
  expect(row(589)).not.toHaveAttribute('aria-current');
  expect(within(row(589)).queryByText('Current')).not.toBeInTheDocument();
});

it('marks each execution expand button as its row focus target for j / k navigation', () => {
  renderTable();
  expect([...document.querySelectorAll('[data-row-focus]')]).toEqual([
    screen.getByRole('button', { name: 'Expand Build run #589 attempt 1' }),
    screen.getByRole('button', { name: 'Expand Build run #590 attempt 1' }),
  ]);
});
