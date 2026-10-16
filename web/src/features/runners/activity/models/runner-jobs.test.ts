import { describe, expect, it } from 'vitest';

import type { Job } from '../../../../shared/api/types';
import { findSelectedJob, normalizeJobRepository, toggleSelectedJob } from './runner-jobs';

describe('normalizeJobRepository', () => {
  it('accepts a repository name or a GitHub URL', () => {
    expect(normalizeJobRepository('  octo/app ')).toBe('octo/app');
    expect(normalizeJobRepository('HTTPS://github.com/octo/app/')).toBe('octo/app');
  });
});

describe('toggleSelectedJob', () => {
  it('opens a new job and closes the open one', () => {
    expect(toggleSelectedJob(null, 7)).toBe(7);
    expect(toggleSelectedJob(3, 7)).toBe(7);
    expect(toggleSelectedJob(7, 7)).toBeNull();
  });
});

describe('findSelectedJob', () => {
  it('finds the selected job among the loaded jobs', () => {
    const job: Job = {
      id: 7,
      name: 'Build application',
      status: 'in_progress',
      conclusion: null,
      started_at: null,
      completed_at: null,
      workflow: 'CI',
      branch: 'main',
      run_number: 42,
      url: 'https://github.com/example/app/actions/runs/1/job/7',
      steps: [],
    };
    expect(findSelectedJob({ jobs: [job], message: '' }, 7)).toBe(job);
    expect(findSelectedJob({ jobs: [job], message: '' }, null)).toBeUndefined();
    expect(findSelectedJob(undefined, 7)).toBeUndefined();
  });
});
