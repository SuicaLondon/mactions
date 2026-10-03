import { formatDateTime, parseTimestamp } from '../../../../../shared/lib/date';

export function CardTimestamp({ value }: { value?: string | null }) {
  const date = parseTimestamp(value);
  if (!date) return <>—</>;
  return <time dateTime={value ?? undefined}>{formatDateTime(date)}</time>;
}
