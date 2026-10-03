import { addMilliseconds, clamp, differenceInMilliseconds, getTime } from 'date-fns';

import { cn } from '../../../../../shared/lib/cn';
import { duration } from '../../../models/playback-time';
import type { RecordingPlayerState } from '../../../types/recording-player';

interface ReplayTimelineProps {
  start: number;
  end: number;
  at: number;
  setAt: RecordingPlayerState['setAt'];
}

export function ReplayTimeline({ start, end, at, setAt }: ReplayTimelineProps) {
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
      onChange={(event) => setAt(getTime(addMilliseconds(start, Number(event.target.value))))}
      onKeyDown={(event) => {
        let offset: number | null = null;
        switch (event.key) {
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
        }
        if (event.key === 'Home' || event.key === 'End' || offset !== null) {
          event.preventDefault();
          setAt((current) => {
            if (event.key === 'Home') return start;
            if (event.key === 'End') return end;
            return getTime(clamp(addMilliseconds(current, offset ?? 0), { start, end }));
          });
        }
      }}
    />
  );
}
