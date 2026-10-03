import { differenceInMilliseconds, isEqual } from 'date-fns';

import { cn } from '../../../../../shared/lib/cn';
import { PauseIcon } from '../../../../../shared/ui/icons/playback/PauseIcon';
import { PlayIcon } from '../../../../../shared/ui/icons/playback/PlayIcon';
import { duration } from '../../../models/playback-time';
import type { RecordingPlayerState } from '../../../types/recording-player';
import { PlaybackSpeed } from './PlaybackSpeed';
import { ReplayTimeline } from './ReplayTimeline';

interface PlaybackTransportProps {
  player: RecordingPlayerState;
}

export function PlaybackTransport({ player }: PlaybackTransportProps) {
  const { start, end, at, setAt, playing, setPlaying, speed, setSpeed, playLabel, ended } = player;
  let PlaybackIcon = PlayIcon;
  let playbackLabel = 'Play replay';
  if (playing) {
    PlaybackIcon = PauseIcon;
    playbackLabel = 'Pause replay';
  }
  return (
    <div className="replay-transport flex items-center gap-3 max-sm:flex-wrap max-sm:gap-2.5">
      <button
        className="replay-play min-h-8 min-w-19.25 text-xs"
        aria-label={playbackLabel}
        disabled={isEqual(end, start)}
        onClick={() => {
          if (!playing && ended) setAt(start);
          setPlaying((value) => !value);
        }}
      >
        <PlaybackIcon className="size-3.25" />
        {playLabel}
      </button>
      <ReplayTimeline start={start} end={end} at={at} setAt={setAt} />
      <output
        className={cn(
          'replay-position font-mono text-xs leading-relaxed whitespace-nowrap tabular-nums',
          'max-sm:ml-auto',
        )}
      >
        {duration(differenceInMilliseconds(at, start))}{' '}
        <span className="text-muted">/ {duration(differenceInMilliseconds(end, start))}</span>
      </output>
      <PlaybackSpeed speed={speed} setSpeed={setSpeed} />
    </div>
  );
}
