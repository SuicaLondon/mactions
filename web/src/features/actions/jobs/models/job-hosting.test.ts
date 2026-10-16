import { expect, it } from 'vitest';

import { jobHostingLabel } from './job-hosting';

it.each<[Parameters<typeof jobHostingLabel>[0], string]>([
  [
    { runner_name: 'mac', status: 'completed', host_type: 'self-hosted', device: 'this_device' },
    'Self-hosted · This device',
  ],
  [{ runner_id: 4, status: 'completed' }, 'Unknown type · Unknown device'],
  [
    { runner_id: 4, status: 'completed', host_type: 'github-hosted' },
    'GitHub-hosted · Unknown device',
  ],
  [{ status: 'queued' }, 'Not assigned'],
  [{ status: 'completed' }, 'Not reported'],
])('describes %j as %s', (job, label) => {
  expect(jobHostingLabel(job)).toBe(label);
});
