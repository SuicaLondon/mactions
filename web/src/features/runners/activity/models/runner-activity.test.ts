import { describe, expect, it } from 'vitest';

import type { Runner } from '../../../../shared/api/types';
import { initialRunnerActivityTab, runnerActivityTitle } from './runner-activity';

const runner: Runner = {
  id: 1,
  name: 'my-mac',
  target: { kind: 'repo', name: 'example/app' },
  labels: [],
  path: '/managed/runner',
  version: '1',
  github_id: 44,
  enabled: true,
  phase: 'ready',
  error: null,
  deregistered: false,
  registration_attempted: true,
  local_status: 'running',
  github_status: 'online',
  busy: true,
  interrupted: false,
};

describe('initialRunnerActivityTab', () => {
  it('opens a busy runner on its jobs', () => {
    expect(initialRunnerActivityTab(runner, false)).toBe('jobs');
  });

  it('opens an idle runner or a diagnostics view on logs', () => {
    expect(initialRunnerActivityTab({ ...runner, busy: false }, false)).toBe('logs');
    expect(initialRunnerActivityTab(runner, true)).toBe('logs');
  });
});

describe('runnerActivityTitle', () => {
  it('names each view', () => {
    expect(runnerActivityTitle('jobs', false)).toBe('Workflow jobs');
    expect(runnerActivityTitle('logs', false)).toBe('Runner output');
    expect(runnerActivityTitle('logs', true)).toBe('Runner diagnostic logs');
  });
});
