import { expect, it } from 'vitest';

import type { JobLogs, JobStep } from '../../../../shared/api/types';
import { makeJob } from '../../../../test/activity-fixtures';
import { jobLogScope } from './job-log-scope';

const step: JobStep = { number: 3, name: 'Test', status: 'completed', conclusion: 'success' };
const job = makeJob({ id: 7, steps: [step] });
const logs: JobLogs = { state: 'available', content: '', message: '', steps: [] };

it('names the full job output', () => {
  expect(jobLogScope(job, undefined, logs)).toEqual({
    step: undefined,
    label: 'Full logs for Build',
    outputLabel: 'Full job output',
    filename: 'job-7.log',
  });
});

it('names a step output', () => {
  expect(jobLogScope(job, step, logs)).toEqual({
    step,
    label: 'Logs for Test',
    outputLabel: 'Step output',
    filename: 'job-7-step-3.log',
  });
});

it('falls back to the full job and names the step when GitHub returned job-scoped output', () => {
  expect(jobLogScope(job, step, { ...logs, scope: 'job' })).toEqual({
    step: undefined,
    label: 'Full logs for Build',
    outputLabel: 'Full job log',
    filename: 'job-7.log',
  });
});
