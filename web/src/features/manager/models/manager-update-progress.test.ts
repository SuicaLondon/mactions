import { describe, expect, it } from 'vitest';

import { managerUpdateProgress, type ManagerUpdateProgressInput } from './manager-update-progress';

const base: ManagerUpdateProgressInput = {
  running: false,
  status: undefined,
  statusError: null,
  statusErrorCount: 0,
  startError: null,
  healthErrorCount: 0,
};

describe('manager update progress', () => {
  it('reports nothing before an update has a status', () => {
    expect(managerUpdateProgress(base)).toEqual({ kind: 'none' });
    expect(managerUpdateProgress({ ...base, status: { state: 'idle', message: '' } })).toEqual({
      kind: 'none',
    });
  });

  it('distinguishes a restart in progress from a manager that never returns', () => {
    const lost = { ...base, running: true, statusError: new Error('offline') };
    expect(managerUpdateProgress({ ...lost, statusErrorCount: 3 })).toEqual({
      kind: 'reconnecting',
    });
    expect(managerUpdateProgress({ ...lost, statusErrorCount: 40 })).toEqual({
      kind: 'unreachable',
    });
  });

  it('shows a start failure only while the status is idle', () => {
    const startError = new Error('Rejected.');
    expect(
      managerUpdateProgress({ ...base, startError, status: { state: 'idle', message: '' } }),
    ).toEqual({ kind: 'start-failed', message: 'Rejected.' });
    expect(
      managerUpdateProgress({ ...base, startError, status: { state: 'failed', message: 'No.' } }),
    ).toMatchObject({ kind: 'reported' });
  });

  it('reports a status read failure once no update is running', () => {
    expect(managerUpdateProgress({ ...base, statusError: new Error('Busy') })).toEqual({
      kind: 'status-failed',
      message: 'Busy',
    });
  });

  it('flags a completed update whose manager has not reconnected', () => {
    const status = { state: 'complete' as const, message: 'Done.' };
    expect(managerUpdateProgress({ ...base, status, healthErrorCount: 29 })).toEqual({
      kind: 'reported',
      status,
      reconnectStalled: false,
    });
    expect(managerUpdateProgress({ ...base, status, healthErrorCount: 30 })).toMatchObject({
      reconnectStalled: true,
    });
  });
});
