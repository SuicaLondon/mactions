import { differenceInMilliseconds, isEqual } from 'date-fns';

import { cn } from '../../../../shared/lib/cn';
import { PauseIcon } from '../../../../shared/ui/icons/PauseIcon';
import { PlayIcon } from '../../../../shared/ui/icons/PlayIcon';
import { type PlaybackClock, playbackLabel } from '../../models/playback-clock';
import { duration } from '../../models/playback-time';
import { PlaybackSpeed } from './PlaybackSpeed';
import { ReplayTimeline } from './ReplayTimeline';

interface PlaybackTransportProps {
  clock: PlaybackClock;
  onTogglePlayback: () => void;
  onSeek: (at: number) => void;
  onSeekBy: (offset: number) => void;
  onSpeedChange: (speed: number) => void;
}

export function PlaybackTransport({
  clock,
  onTogglePlayback,
  onSeek,
  onSeekBy,
  onSpeedChange,
}: PlaybackTransportProps) {
  const { start, end, at, playing, speed } = clock;
  let PlaybackIcon = PlayIcon;
  let playbackAction = 'Play replay';
  if (playing) {
    PlaybackIcon = PauseIcon;
    playbackAction = 'Pause replay';
  }
  return (
    <div className="flex items-center gap-3 max-sm:flex-wrap max-sm:gap-2.5">
      <button
        className="min-h-8 min-w-19.25 text-xs"
        aria-label={playbackAction}
        disabled={isEqual(end, start)}
        onClick={onTogglePlayback}
      >
        <PlaybackIcon className="size-3.25" />
        {playbackLabel(clock)}
      </button>
      <ReplayTimeline start={start} end={end} at={at} onSeek={onSeek} onSeekBy={onSeekBy} />
      <output
        className={cn('font-mono text-xs/relaxed whitespace-nowrap tabular-nums', 'max-sm:ml-auto')}
      >
        {duration(differenceInMilliseconds(at, start))}{' '}
        <span className="text-muted">/ {duration(differenceInMilliseconds(end, start))}</span>
      </output>
      <PlaybackSpeed speed={speed} onSpeedChange={onSpeedChange} />
    </div>
  );
}
