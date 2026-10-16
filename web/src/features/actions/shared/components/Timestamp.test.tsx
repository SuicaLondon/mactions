import { render } from '@testing-library/react';
import { expect, it } from 'vitest';

import {
  formatDateTime,
  formatShortDate,
  formatTime,
  parseTimestamp,
} from '../../../../shared/lib/date';
import { Timestamp } from './Timestamp';

const value = '2026-09-30T01:02:03Z';
const date = parseTimestamp(value)!;

it.each([
  { format: 'full', text: formatDateTime(date), title: null },
  {
    format: 'short',
    text: `${formatShortDate(date)}, ${formatTime(date)}`,
    title: formatDateTime(date),
  },
  { format: 'time', text: formatTime(date, true), title: formatDateTime(date) },
] as const)(
  'shows a $format timestamp with its machine-readable value',
  ({ format, text, title }) => {
    const { container } = render(<Timestamp value={value} format={format} />);
    const time = container.querySelector('time');
    expect(time).toHaveAttribute('datetime', value);
    expect(time).toHaveTextContent(text, { normalizeWhitespace: false });
    expect(time?.getAttribute('title') ?? null).toBe(title);
  },
);

it.each([null, undefined, '', 'not a date'])('shows a dash for a missing value (%j)', (missing) => {
  const { container } = render(<Timestamp value={missing} format="short" />);
  expect(container).toHaveTextContent(/^—$/);
  expect(container.querySelector('time')).toBeNull();
});
