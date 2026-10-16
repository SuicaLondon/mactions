import { addMilliseconds, differenceInMilliseconds, getTime } from 'date-fns';

import { cn } from '../../../../shared/lib/cn';
import { duration } from '../../models/playback-time';

interface ReplayTimelineProps {
  start: number;
  end: number;
  at: number;
  onSeek: (at: number) => void;
  onSeekBy: (offset: number) => void;
}

export function ReplayTimeline({ start, end, at, onSeek, onSeekBy }: ReplayTimelineProps) {
  return (
    <input
      className={cn(
        'min-w-10 flex-1 cursor-pointer border-0 bg-transparent p-0 accent-accent',
        'max-sm:min-w-25',
      )}
      type="range"
      min={0}
      max={differenceInMilliseconds(end, start)}
      step="any"
      value={differenceInMilliseconds(at, start)}
      aria-label="Replay timeline"
      aria-valuetext={`${duration(differenceInMilliseconds(at, start))} of ${duration(differenceInMilliseconds(end, start))}`}
      onChange={(event) => onSeek(getTime(addMilliseconds(start, Number(event.target.value))))}
      onKeyDown={(event) => {
        let offset: number;
        switch (event.key) {
          case 'Home':
            event.preventDefault();
            onSeek(start);
            return;
          case 'End':
            event.preventDefault();
            onSeek(end);
            return;
          case 'ArrowRight':
          case 'ArrowUp':
            offset = 1000;
            break;
          case 'ArrowLeft':
          case 'ArrowDown':
            offset = -1000;
            break;
          case 'PageUp':
            offset = 10_000;
            break;
          case 'PageDown':
            offset = -10_000;
            break;
          default:
            return;
        }
        event.preventDefault();
        onSeekBy(offset);
      }}
    />
  );
}
