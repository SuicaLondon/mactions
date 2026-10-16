import { describe, expect, it } from 'vitest';

import type { Runner } from '../../../../shared/api/types';
import { menuFocusIndex } from './menu-focus';
import { runnerMenuItems } from './runner-menu-items';

const runner = {
  id: 1,
  name: 'build-mac',
  github_id: 42,
  deregistered: false,
  local_status: 'running',
} as unknown as Runner;

function summary(items: ReturnType<typeof runnerMenuItems>) {
  return items.map(({ label, disabled }) => {
    if (disabled) return `${label} (disabled)`;
    return label;
  });
}

describe('runnerMenuItems', () => {
  it('offers every operation for a registered running runner', () => {
    expect(summary(runnerMenuItems(runner, { locked: false, connected: true }))).toEqual([
      'Stop…',
      'Restart…',
      'Edit labels…',
      'Delete runner…',
    ]);
  });

  it('needs GitHub to edit labels or delete a registered runner', () => {
    expect(summary(runnerMenuItems(runner, { locked: false, connected: false }))).toEqual([
      'Stop…',
      'Restart…',
      'Edit labels… (disabled)',
      'Delete runner… (disabled)',
    ]);
  });

  it('offers setup for an unregistered stopped runner and locks everything during operations', () => {
    const unregistered = { ...runner, github_id: null, local_status: 'stopped' } as Runner;
    expect(summary(runnerMenuItems(unregistered, { locked: false, connected: true }))).toEqual([
      'Start (disabled)',
      'Restart… (disabled)',
      'Edit labels… (disabled)',
      'Resume setup…',
      'Delete runner…',
    ]);
    expect(
      runnerMenuItems(unregistered, { locked: true, connected: true }).every(
        (item) => item.disabled,
      ),
    ).toBe(true);
  });
});

describe('menuFocusIndex', () => {
  it('wraps arrow navigation and jumps with Home and End', () => {
    expect(menuFocusIndex('ArrowDown', 2, 3)).toBe(0);
    expect(menuFocusIndex('ArrowUp', 0, 3)).toBe(2);
    expect(menuFocusIndex('ArrowDown', -1, 3)).toBe(0);
    expect(menuFocusIndex('Home', 2, 3)).toBe(0);
    expect(menuFocusIndex('End', 0, 3)).toBe(2);
    expect(menuFocusIndex('a', 0, 3)).toBeUndefined();
  });
});
