import { expect, it } from 'vitest';

import { getTime, parseTimestamp } from '../../../../shared/lib/date';
import { makeJob } from '../../../../test/activity-fixtures';
import { jobCardDetails } from './job-card-details';

it('lists the reported facts in order and leaves out the rest', () => {
  const job = makeJob({
    event: 'workflow_dispatch',
    actor: 'octocat',
    triggering_actor: 'hubot',
    run_number: 42,
    run_attempt: 2,
    started_at: '2026-09-30T01:00:00Z',
    completed_at: '2026-09-30T01:01:30Z',
    runner_name: 'build-mac',
    host_type: 'self-hosted',
    device: 'other_device',
  });
  expect(jobCardDetails(job)).toEqual([
    { label: 'Trigger', value: 'workflow dispatch' },
    { label: 'Actor', value: '@octocat' },
    { label: 'Triggered by', value: '@hubot' },
    { label: 'Run', value: '#42 · attempt 2' },
    { label: 'Duration', value: '1m 30s' },
    { label: 'Runner', value: 'build-mac' },
    { label: 'Runner type', value: 'Self-hosted' },
    { label: 'Device', value: 'Other device' },
  ]);
});

it('names the triggering actor only when it differs from the actor', () => {
  const job = makeJob({ actor: 'octocat', triggering_actor: 'octocat', run_attempt: null });
  const labels = jobCardDetails(job).map((detail) => detail.label);
  expect(labels).toEqual(['Actor', 'Run', 'Duration']);
  expect(jobCardDetails(job)).toContainEqual({ label: 'Run', value: '#42' });
});

it('counts a running job to the given time, such as a replay position', () => {
  const job = makeJob({
    status: 'in_progress',
    conclusion: null,
    started_at: '2026-09-30T01:00:00Z',
  });
  const now = getTime(parseTimestamp('2026-09-30T01:00:45Z')!);
  expect(jobCardDetails(job, now)).toContainEqual({ label: 'Duration', value: '45s' });
});
