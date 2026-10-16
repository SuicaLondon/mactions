import { describe, expect, it } from 'vitest';

import type { Runner } from '../../../../shared/api/types';
import type { WorkflowRun } from '../../../actions/data/types/activity-types';
import type { DisplayRunner } from './runner-list';
import { runnerRowPresentation } from './runner-row-presentation';
import { assignedRuns, noWorkMessage } from './runner-work';

const local = {
  id: 1,
  name: 'build-mac',
  target: { kind: 'org', name: 'example' },
  labels: [],
  github_id: 42,
  enabled: true,
  phase: 'ready',
  error: null,
  deregistered: false,
  local_status: 'running',
  github_status: 'unknown',
  busy: null,
  interrupted: false,
} as unknown as Runner;

const row: DisplayRunner = {
  key: 'local-1',
  name: 'build-mac',
  localId: 1,
  githubId: 42,
  local,
  device: 'this_device',
  labels: ['release', 'macOS'],
};

describe('runnerRowPresentation', () => {
  it('shows the short checking state while GitHub has not answered for a local row', () => {
    const view = runnerRowPresentation(row, true);
    expect(view.statusLabel).toBe('Checking…');
    expect(view.statusTitle).toBe('Checking GitHub…');
    expect(view.checkingLabels).toBe(true);
    expect(view.labelsTitle).toBeUndefined();
    expect(view.deviceLabel).toBe('This device');
    expect(view.scopeLabel).toBe('Organization');
  });

  it('lists labels and flags unconfirmed repository access once checking ends', () => {
    const view = runnerRowPresentation({ ...row, scopeUnconfirmed: true }, false);
    expect(view.statusTitle).toBeUndefined();
    expect(view.labelsTitle).toBe('release, macOS');
    expect(view.scopeLabel).toBe('Repository access unconfirmed');
  });
});

describe('runner work', () => {
  const run = {
    id: 7,
    jobs: [
      { id: 1, runner_id: 42 },
      { id: 2, runner_id: 9 },
    ],
  } as unknown as WorkflowRun;

  it('keeps only runs and jobs on the runner', () => {
    expect(assignedRuns([run], 42)).toEqual([{ run, jobs: [run.jobs![0]] }]);
    expect(assignedRuns([run], 5)).toEqual([]);
    expect(assignedRuns([run], undefined)).toEqual([]);
  });

  it('explains missing work in priority order', () => {
    const base = { connected: true, unavailable: false, githubId: 42, busy: null };
    expect(noWorkMessage({ ...base, connected: false, unavailable: true })).toBe(
      'GitHub disconnected',
    );
    expect(noWorkMessage({ ...base, unavailable: true })).toBe('Work unavailable');
    expect(noWorkMessage({ ...base, githubId: undefined })).toBe('Runner identity unavailable');
    expect(noWorkMessage({ ...base, busy: false })).toBe('No active jobs');
    expect(noWorkMessage(base)).toBe('No jobs reported');
  });
});
