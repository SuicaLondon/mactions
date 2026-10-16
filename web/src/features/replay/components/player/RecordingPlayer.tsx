import { usePlaybackClock } from '../../hooks/use-playback-clock';
import { playbackBounds } from '../../models/playback-clock';
import { type CIRecording } from '../../types/recording';
import { PlaybackTransport } from './PlaybackTransport';
import { RecordingJobs } from './RecordingJobs';
import { RecordingPlaybackCard } from './RecordingPlaybackCard';

interface RecordingPlayerProps {
  recording: CIRecording;
}

/** Plays one recording: the playback controls above the jobs reported at the current moment. */
export function RecordingPlayer({ recording }: RecordingPlayerProps) {
  const { clock, togglePlayback, seekTo, seekBy, setSpeed } = usePlaybackClock(
    playbackBounds(recording),
  );
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <RecordingPlaybackCard recording={recording} at={clock.at}>
        <PlaybackTransport
          clock={clock}
          onTogglePlayback={togglePlayback}
          onSeek={seekTo}
          onSeekBy={seekBy}
          onSpeedChange={setSpeed}
        />
      </RecordingPlaybackCard>
      <RecordingJobs recording={recording} at={clock.at} />
    </div>
  );
}
