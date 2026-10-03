import { getTime, parseISO, toDate } from 'date-fns';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  currentDate,
  formatDateTime,
  formatShortDate,
  formatTime,
  formatUtcTimestamp,
  parseTimestamp,
} from './date';

describe('date helpers', () => {
  afterEach(() => vi.useRealTimers());

  it('reads the current clock through date-fns', () => {
    vi.useFakeTimers();
    vi.setSystemTime(parseISO('2026-09-30T15:59:59.423Z'));
    expect(formatUtcTimestamp(currentDate())).toBe('2026-09-30T15:59:59.423Z');
  });
  it('preserves offsets and milliseconds when serializing in UTC', () => {
    const date = parseTimestamp('2026-09-30T23:59:59.423+08:00');
    expect(date).not.toBeNull();
    expect(formatUtcTimestamp(date!)).toBe('2026-09-30T15:59:59.423Z');
    expect(formatUtcTimestamp(getTime(date!))).toBe('2026-09-30T15:59:59.423Z');
  });

  it.each([undefined, null, '', 'not a date', '2026-02-30T10:00:00Z'])('rejects %s', (value) => {
    expect(parseTimestamp(value)).toBeNull();
  });

  it('uses an em dash for invalid display timestamps', () => {
    const invalid = toDate(NaN);
    expect(formatDateTime(invalid)).toBe('—');
    expect(formatShortDate(invalid)).toBe('—');
    expect(formatTime(invalid)).toBe('—');
  });

  it('rejects invalid timestamps for recording serialization', () => {
    expect(() => formatUtcTimestamp(NaN)).toThrow(RangeError);
  });

  it('preserves valid leap-day timestamps', () => {
    expect(formatUtcTimestamp(parseISO('2024-02-29T00:00:00.001Z'))).toBe(
      '2024-02-29T00:00:00.001Z',
    );
  });
});
