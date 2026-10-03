import { utc } from '@date-fns/utc';
import { constructNow, format, intlFormat, isValid, parseISO } from 'date-fns';

// Scripts share the web dependency installation through this entry point.
export { addMinutes, getTime, isBefore } from 'date-fns';

export function currentDate(): Date {
  return constructNow(undefined);
}

export function parseTimestamp(value?: string | null): Date | null {
  if (!value) return null;
  const date = parseISO(value);
  if (isValid(date)) return date;
  return null;
}

export function formatDateTime(value: Date | number): string {
  if (!isValid(value)) return '—';
  return intlFormat(value, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  });
}

export function formatShortDate(value: Date | number): string {
  if (!isValid(value)) return '—';
  return intlFormat(value, { month: 'short', day: 'numeric' });
}

export function formatTime(value: Date | number, seconds = false): string {
  if (!isValid(value)) return '—';
  const options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
  if (seconds) options.second = '2-digit';
  return intlFormat(value, options);
}

export function formatUtcTimestamp(value: Date | number): string {
  return format(value, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", { in: utc });
}
