import { expect, it } from 'vitest';

import { makeJobSummary } from '../../../../test/activity-fixtures';
import { runProgress, runProgressLabel } from './run-progress';

const job = makeJobSummary();

it('counts completed and failed jobs', () => {
  expect(
    runProgress([
      job,
      { ...job, id: 2, conclusion: 'timed_out' },
      { ...job, id: 3, status: 'in_progress', conclusion: null },
    ]),
  ).toEqual({ total: 3, completed: 2, failed: 1 });
});

it.each([
  [{ total: 3, completed: 3, failed: 2 }, '2 of 3 jobs failed'],
  [{ total: 3, completed: 1, failed: 0 }, '1/3 jobs done'],
  [{ total: 1, completed: 1, failed: 0 }, '1 job'],
])('labels progress %j as %s, leading with failures', (progress, label) => {
  expect(runProgressLabel(progress)).toBe(label);
});
