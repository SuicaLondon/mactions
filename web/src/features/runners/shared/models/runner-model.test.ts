import { describe, expect, it } from 'vitest';

import type { Runner } from '../../../../shared/api/types';
import { isUnregistered } from './runner-model';

const runner: Runner = {
  id: 1,
  name: 'build-mac',
  target: { kind: 'repo', name: 'example/build' },
  labels: [],
  path: '/managed/runner',
  version: '2.999.0',
  github_id: 42,
  enabled: true,
  phase: 'ready',
  error: null,
  deregistered: false,
  registration_attempted: true,
  local_status: 'running',
  github_status: 'online',
  busy: false,
  interrupted: false,
};

describe('isUnregistered', () => {
  it('treats a runner without a GitHub registration or a deregistered one as unregistered', () => {
    expect(isUnregistered(runner)).toBe(false);
    expect(isUnregistered({ ...runner, github_id: null })).toBe(true);
    expect(isUnregistered({ ...runner, deregistered: true })).toBe(true);
  });
});
