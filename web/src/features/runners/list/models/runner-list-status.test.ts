import { describe, expect, it } from 'vitest';

import { rowFocusIndex } from './row-navigation';
import { runnerDataAlert } from './runner-data-alert';
import { runnerDataCoverage } from './runner-data-coverage';
import { isCheckingGitHub, runnerEmptyDescription, runnerEmptyTitle } from './runner-list-status';

describe('isCheckingGitHub', () => {
  it('checks while the connection is unknown or the first connected inventory is pending', () => {
    const progress = { hasInventory: false, inventoryPending: true };
    expect(isCheckingGitHub({ ...progress, connection: 'checking' })).toBe(true);
    expect(isCheckingGitHub({ ...progress, connection: 'connected' })).toBe(true);
    expect(isCheckingGitHub({ ...progress, connection: 'disconnected' })).toBe(false);
    expect(
      isCheckingGitHub({ ...progress, inventoryPending: false, connection: 'connected' }),
    ).toBe(false);
  });

  it('keeps cached inventory on screen', () => {
    expect(
      isCheckingGitHub({ hasInventory: true, inventoryPending: true, connection: 'checking' }),
    ).toBe(false);
  });
});

describe('empty runner list copy', () => {
  it('explains filtered, failed, and empty lists', () => {
    expect(runnerEmptyTitle(2, 'Failed')).toBe('No Matching Runners');
    expect(runnerEmptyDescription(2, 'Failed')).toBe(
      'Try another search, status or device filter.',
    );
    expect(runnerEmptyTitle(0, 'Failed')).toBe('Unable to load runners');
    expect(runnerEmptyDescription(0, 'Failed')).toBe('Failed');
    expect(runnerEmptyTitle(0, undefined)).toBe('No Runners');
    expect(runnerEmptyDescription(0, undefined)).toMatch(/^Add a runner/);
  });
});

describe('runnerDataAlert', () => {
  it('names the failed source and combines both failures', () => {
    const inventory = new Error('Denied');
    const work = new Error('Rate limited');
    expect(runnerDataAlert(null, null)).toBeNull();
    expect(runnerDataAlert(inventory, null)).toEqual({
      label: 'GitHub runners unavailable',
      error: inventory,
    });
    expect(runnerDataAlert(null, work)).toEqual({ label: 'Current work unavailable', error: work });
    const both = runnerDataAlert(inventory, work);
    expect(both?.label).toBe('GitHub data unavailable');
    expect(both?.error.message).toBe('Denied\nCurrent work: Rate limited');
  });
});

describe('runnerDataCoverage', () => {
  const quiet = {
    connected: true,
    inventoryMessage: '',
    workMessage: '',
    inventorySeconds: 30,
    workSeconds: 30,
  };

  it('has nothing to note for complete data polled every 30 seconds', () => {
    expect(runnerDataCoverage(quiet)).toBeNull();
  });

  it('notes coverage messages and slow polling only while connected', () => {
    expect(runnerDataCoverage({ ...quiet, workMessage: 'Partial' })).toEqual({
      inventoryMessage: '',
      workMessage: 'Partial',
      refresh: undefined,
    });
    expect(runnerDataCoverage({ ...quiet, workSeconds: 60 })?.refresh).toEqual({
      inventorySeconds: 30,
      workSeconds: 60,
    });
    expect(runnerDataCoverage({ ...quiet, connected: false, workSeconds: 60 })).toBeNull();
  });
});

describe('rowFocusIndex', () => {
  it('moves within the rows and ignores other keys', () => {
    expect(rowFocusIndex('Home', 2, 4)).toBe(0);
    expect(rowFocusIndex('End', 0, 4)).toBe(3);
    expect(rowFocusIndex('ArrowUp', 0, 4)).toBe(0);
    expect(rowFocusIndex('ArrowDown', 3, 4)).toBe(3);
    expect(rowFocusIndex('ArrowDown', 1, 4)).toBe(2);
    expect(rowFocusIndex('Enter', 1, 4)).toBeUndefined();
  });
});
