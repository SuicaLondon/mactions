import {
  formatDateTime,
  formatShortDate,
  formatTime,
  type parseTimestamp,
} from '../../../../../../shared/lib/date';
import { type RunListItem } from './RunListItem';

export function RunStartTime({
  started,
  run,
}: {
  started: ReturnType<typeof parseTimestamp>;
  run: Parameters<typeof RunListItem>[0]['run'];
}) {
  if (started)
    return (
      <time
        className="flex flex-col gap-1"
        dateTime={run.started_at!}
        title={formatDateTime(started)}
      >
        <span>{formatShortDate(started)}</span>
        <span>{formatTime(started)}</span>
      </time>
    );
  return '—';
}
