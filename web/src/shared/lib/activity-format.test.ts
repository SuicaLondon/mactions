import { addMilliseconds, getTime, parseISO } from 'date-fns';
import { describe, expect, it } from 'vitest';

import { duration, stateFor } from './activity-format';
import { formatUtcTimestamp } from './date';

describe('activity state presentation', () => {
  it.each([
    ['success', 'success', 'check', 'Success'],
    ['failure', 'failure', 'close', 'Failure'],
    ['timed_out', 'failure', 'close', 'Timed out'],
    ['action_required', 'failure', 'close', 'Action required'],
    ['startup_failure', 'failure', 'close', 'Startup failure'],
    ['in_progress', 'running', 'refresh', 'Running'],
    ['queued', 'queued', 'clock', 'Queued'],
    ['waiting', 'queued', 'clock', 'Waiting'],
    ['pending', 'queued', 'clock', 'Pending'],
    ['requested', 'queued', 'clock', 'Requested'],
    ['cancelled', 'neutral', 'cancel', 'Cancelled'],
    ['skipped', 'neutral', 'minus', 'Skipped'],
    ['completed', 'neutral', 'clock', 'Completed'],
    ['new_state', 'neutral', 'clock', 'New state'],
  ])('presents %s', (status, tone, icon, label) => {
    expect(stateFor(status, null)).toEqual({ tone, icon, label });
  });

  it('uses the conclusion before the status', () => {
    expect(stateFor('completed', 'success')).toEqual({
      tone: 'success',
      icon: 'check',
      label: 'Success',
    });
  });

  it('falls back to the status for an empty conclusion', () => {
    expect(stateFor('in_progress', '')).toEqual({
      tone: 'running',
      icon: 'refresh',
      label: 'Running',
    });
  });
});

describe('activity durations', () => {
  const start = '2026-09-30T10:00:00.000Z';

  it.each([
    [0, '0s'],
    [999, '0s'],
    [60_000, '1m 0s'],
    [3_661_999, '1h 1m 1s'],
    [90_061_000, '25h 1m 1s'],
    [-1_000, '0s'],
  ])('formats %i milliseconds as %s', (milliseconds, expected) => {
    const end = formatUtcTimestamp(addMilliseconds(parseISO(start), milliseconds));
    expect(duration(start, end)).toBe(expected);
  });

  it('measures real elapsed time across a daylight-saving change', () => {
    expect(duration('2026-03-08T01:30:00-05:00', '2026-03-08T03:30:00-04:00')).toBe('1h 0m 0s');
  });

  it('measures a running job against the supplied replay clock', () => {
    const now = getTime(parseISO('2026-09-30T10:01:05.900Z'));
    expect(duration(start, null, true, now)).toBe('1m 5s');
  });

  it('uses an em dash when a time is absent or invalid', () => {
    expect(duration(undefined, start)).toBe('—');
    expect(duration(start, null)).toBe('—');
    expect(duration('invalid', start)).toBe('—');
    expect(duration(start, 'invalid')).toBe('—');
    expect(duration(start, null, true, NaN)).toBe('—');
  });
});
