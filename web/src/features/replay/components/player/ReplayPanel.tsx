import type { CIRecording } from '../../types/recording';
import { RecordingPlayer } from './RecordingPlayer';

export function ReplayPanel({ recording }: { recording: CIRecording }) {
  return (
    <RecordingPlayer
      key={`${recording.run_id}:${recording.started_at}:${recording.finished_at}`}
      recording={recording}
    />
  );
}
