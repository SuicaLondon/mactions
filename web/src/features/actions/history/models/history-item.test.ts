import { expect, it } from 'vitest';

import { makeJobSummary } from '../../../../test/activity-fixtures';
import type { JobSummary } from '../../data/types/activity-types';
import { historyEnvironment, historyEnvironmentLabel, historyExpandLabel } from './history-item';

const job = makeJobSummary({
  run_number: 589,
  run_attempt: 2,
  runner_id: 11,
  runner_name: 'mini',
  host_type: 'self-hosted',
  device: 'this_device',
});

it('joins the host type and device', () => {
  expect(historyEnvironment(job)).toBe('Self-hosted · This device');
  expect(historyEnvironment({ host_type: 'github-hosted', device: 'other_device' })).toBe(
    'GitHub-hosted · Other device',
  );
  expect(historyEnvironment({ host_type: 'unknown', device: 'unknown' })).toBe('');
});

it('explains an unreported environment', () => {
  const unknown: JobSummary = { ...job, host_type: 'unknown', device: 'unknown' };
  expect(historyEnvironmentLabel(job)).toBe('Self-hosted · This device');
  expect(historyEnvironmentLabel(unknown)).toBe('Environment not reported');
  expect(
    historyEnvironmentLabel({ ...unknown, status: 'queued', runner_id: null, runner_name: null }),
  ).toBe('Awaiting assignment');
});

it('names the job, run, and attempt', () => {
  expect(historyExpandLabel(job)).toBe('Expand Build run #589 attempt 2');
  expect(historyExpandLabel({ ...job, run_attempt: undefined })).toBe('Expand Build run #589');
});
