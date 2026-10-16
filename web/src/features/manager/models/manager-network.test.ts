import { describe, expect, it } from 'vitest';

import type { ManagerSettings } from '../types/manager';
import { awaitsManagerRestart, isRemoteDashboard } from './manager-network';

const saved: ManagerSettings = {
  lan_access: true,
  version: '0.1.0',
  source: 'script',
  managed: true,
  process_id: 1000,
  restart_scheduled: true,
};

describe('manager network', () => {
  it.each(['localhost', '127.0.0.1', '[::1]', '::1'])('treats %s as this Mac', (hostname) => {
    expect(isRemoteDashboard(hostname)).toBe(false);
  });

  it('treats other hosts as remote', () => {
    expect(isRemoteDashboard('192.168.1.20')).toBe(true);
  });

  it('awaits a scheduled restart unless it closes a remote connection', () => {
    expect(awaitsManagerRestart(undefined, false)).toBe(false);
    expect(awaitsManagerRestart({ ...saved, restart_scheduled: false }, false)).toBe(false);
    expect(awaitsManagerRestart(saved, true)).toBe(true);
    expect(awaitsManagerRestart({ ...saved, lan_access: false }, false)).toBe(true);
    expect(awaitsManagerRestart({ ...saved, lan_access: false }, true)).toBe(false);
  });
});
