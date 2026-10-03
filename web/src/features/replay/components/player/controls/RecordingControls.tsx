import { cn } from '../../../../../shared/lib/cn';
import { formatDateTime, formatUtcTimestamp } from '../../../../../shared/lib/date';
import type { CIRecording } from '../../../types/recording';
import type { RecordingPlayerState } from '../../../types/recording-player';
import { PlaybackTransport } from './PlaybackTransport';
import { RecordingIdentity } from './RecordingIdentity';

interface RecordingControlsProps {
  recording: CIRecording;
  player: RecordingPlayerState;
}

export function RecordingControls({ recording, player }: RecordingControlsProps) {
  return (
    <section
      className="replay-controls rounded-lg border border-line bg-surface px-4 py-3.5 max-sm:p-3"
      aria-label="Recording playback"
    >
      <RecordingIdentity recording={recording} />
      <PlaybackTransport player={player} />
      <div
        className={cn(
          'replay-caption mt-2.5 flex flex-wrap justify-between gap-x-3 gap-y-1.5 text-xs',
          'text-muted',
        )}
      >
        <time dateTime={formatUtcTimestamp(player.at)}>{formatDateTime(player.at)}</time>
        <span>Recorded snapshots · {recording.frames.length} frames</span>
      </div>
    </section>
  );
}
