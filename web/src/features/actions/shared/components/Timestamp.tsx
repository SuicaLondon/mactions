import {
  formatDateTime,
  formatShortDate,
  formatTime,
  parseTimestamp,
} from '../../../../shared/lib/date';

/**
 * A timestamp as a `<time>` element, or a dash when it is missing. `full` spells out the date and
 * time. `short` gives the short date and time on one line, and `time` the time with seconds; both
 * keep the full date and time in their title.
 */
export function Timestamp({
  value,
  format,
}: {
  value: string | null | undefined;
  format: 'full' | 'short' | 'time';
}) {
  const date = parseTimestamp(value);
  if (!value || !date) return '—';
  if (format === 'full') return <time dateTime={value}>{formatDateTime(date)}</time>;
  if (format === 'time') {
    return (
      <time dateTime={value} title={formatDateTime(date)}>
        {formatTime(date, true)}
      </time>
    );
  }
  return (
    <time className="whitespace-nowrap tabular-nums" dateTime={value} title={formatDateTime(date)}>
      {formatShortDate(date)}, {formatTime(date)}
    </time>
  );
}
