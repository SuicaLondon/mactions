import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { Job } from '../../../shared/api/types';
import { WorkflowGraph } from '../components/graph/WorkflowGraph';

const completedJob: Job = {
  id: 10,
  name: 'Build',
  workflow: 'CI',
  run_number: 42,
  run_id: 900,
  run_attempt: 1,
  status: 'completed',
  conclusion: 'success',
  branch: 'main',
  started_at: '2026-09-29T10:00:00Z',
  completed_at: '2026-09-29T10:02:05Z',
  url: 'https://github.com/example/build/actions/runs/900/job/10',
  steps: [{ number: 1, name: 'Compile', status: 'completed', conclusion: 'success' }],
};

describe('workflow graph', () => {
  it.each([
    { started: null, completed: null, elapsed: 'Not started' },
    { started: 'invalid', completed: null, elapsed: '' },
    { started: '2026-09-29T10:00:00Z', completed: 'invalid', elapsed: '' },
    { started: '2026-09-29T10:00:01Z', completed: null, elapsed: '0s' },
    { started: '2026-09-28T07:00:00Z', completed: null, elapsed: '27h 0m' },
  ])('keeps elapsed time semantics for $elapsed', ({ started, completed, elapsed }) => {
    const job = { ...completedJob, started_at: started, completed_at: completed };
    render(
      <WorkflowGraph
        jobs={[job]}
        selectedJobId={null}
        onSelectJob={vi.fn()}
        at={getTime(parseISO('2026-09-29T10:00:00Z'))}
      />,
    );
    const node = screen.getByRole('button', { name: 'Build, Success, CI #42' });
    const displayed = node.querySelector('.tabular-nums');
    expect(displayed?.textContent).toBe(elapsed);
  });

  it('groups by run identity and attempt while prioritizing active assigned jobs', () => {
    const active: Job = {
      ...completedJob,
      id: 11,
      name: 'Test',
      status: 'in_progress',
      conclusion: null,
      completed_at: null,
    };
    const other: Job = { ...completedJob, id: 12, name: 'Deploy', run_id: 901 };
    const retry: Job = { ...completedJob, id: 13, name: 'Retry build', run_attempt: 2 };
    const jobs = [other, completedJob, retry, active];
    render(<WorkflowGraph jobs={jobs} selectedJobId={11} onSelectJob={vi.fn()} />);

    expect(screen.getByText('3 runs · 4 jobs')).toBeVisible();
    const firstRun = screen.getAllByRole('list', { name: 'Jobs in CI #42' })[0];
    expect(
      within(firstRun)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual([expect.stringContaining('Test'), expect.stringContaining('Build')]);
    expect(within(firstRun).getByText('2m 5s')).toBeVisible();
    expect(screen.getByRole('list', { name: 'Jobs in CI #42 · attempt 2' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Test, Running, CI #42' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(jobs.map((job) => job.id)).toEqual([12, 10, 13, 11]);
  });

  it('supports keyboard selection and legacy jobs without run IDs', async () => {
    const onSelectJob = vi.fn();
    const first: Job = { ...completedJob, run_id: undefined, run_attempt: undefined };
    const second: Job = { ...first, id: 11, name: 'Test' };
    render(<WorkflowGraph jobs={[first, second]} selectedJobId={10} onSelectJob={onSelectJob} />);

    expect(screen.getByText('1 run · 2 jobs')).toBeVisible();
    const user = userEvent.setup();
    const target = screen.getByRole('button', { name: 'Test, Success, CI #42' });
    target.focus();
    await user.keyboard('{Enter}');
    expect(onSelectJob).toHaveBeenCalledWith(11);
    expect(target).toHaveFocus();
  });
});
import { getTime, parseISO } from 'date-fns';
