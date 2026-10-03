import { useRecordingPlayer } from '../../hooks/use-recording-player';
import type { CIRecording } from '../../types/recording';
import { RecordingControls } from './controls/RecordingControls';
import { RecordingJobs } from './RecordingJobs';

interface RecordingPlayerProps {
  recording: CIRecording;
}

export function RecordingPlayer({ recording }: RecordingPlayerProps) {
  const player = useRecordingPlayer(recording);
  return (
    <div className="replay-panel flex min-w-0 flex-col gap-4">
      <RecordingControls recording={recording} player={player} />
      <RecordingJobs
        logs={player.logs}
        frame={player.frame}
        selectedJob={player.selectedJob}
        setSelectedJobId={player.setSelectedJobId}
        at={player.at}
        recording={recording}
      />
    </div>
  );
}
