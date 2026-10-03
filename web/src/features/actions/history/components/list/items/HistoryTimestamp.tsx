import {
  formatDateTime,
  formatShortDate,
  formatTime,
  type parseTimestamp,
} from '../../../../../../shared/lib/date';
import { type HistoryItem } from './HistoryItem';

export function HistoryTimestamp({
  started,
  job,
}: {
  started: ReturnType<typeof parseTimestamp>;
  job: Parameters<typeof HistoryItem>[0]['job'];
}) {
  if (started)
    return (
      <time
        className="flex flex-col gap-1"
        dateTime={job.started_at!}
        title={formatDateTime(started)}
      >
        <span>{formatShortDate(started)}</span>
        <span>{formatTime(started)}</span>
      </time>
    );
  return '—';
}
