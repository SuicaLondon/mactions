import { expect, it } from 'vitest';

import type { Job } from '../../../../shared/api/types';
import { makeJob } from '../../../../test/activity-fixtures';
import { jobProgress } from './job-progress';

const job = makeJob({
  steps: [
    { number: 1, name: 'Set up job', status: 'completed', conclusion: 'success' },
    { number: 5, name: 'Test', status: 'completed', conclusion: 'success' },
    { number: 11, name: 'Complete job', status: 'completed', conclusion: 'success' },
  ],
});

it('counts completed steps for a Job that did not fail', () => {
  expect(jobProgress(job)).toMatchObject({
    label: '3/3 steps completed',
    outcome: '3 of 3 steps completed',
    value: 3,
    max: 3,
    tone: 'success',
    failedStep: undefined,
  });
});

it('reports the failed step number against the highest step number', () => {
  const failed: Job = {
    ...job,
    conclusion: 'failure',
    steps: [
      { number: 1, name: 'Set up job', status: 'completed', conclusion: 'success' },
      { number: 5, name: 'Test', status: 'completed', conclusion: 'failure' },
      { number: 11, name: 'Complete job', status: 'completed', conclusion: 'skipped' },
    ],
  };
  expect(jobProgress(failed)).toMatchObject({
    label: 'Failed at step 5 · Test',
    outcome: 'Failed at step 5 of 11',
    value: 5,
    max: 11,
    tone: 'failure',
    failedStep: { number: 5 },
  });
});

it('keeps a nonzero maximum for a Job without steps', () => {
  expect(jobProgress({ ...job, steps: [] })).toMatchObject({ value: 0, max: 1 });
});
