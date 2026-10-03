import { formatDateTime, formatTime, parseTimestamp } from '../../../../../shared/lib/date';

export function WorkspaceTimestamp({
  value,
  compact = false,
}: {
  value?: string | null;
  compact?: boolean;
}) {
  const date = parseTimestamp(value);
  if (!date) return <>—</>;
  let label = formatDateTime(date);
  if (compact) label = formatTime(date, true);
  return (
    <time dateTime={value ?? undefined} title={formatDateTime(date)}>
      {label}
    </time>
  );
}
