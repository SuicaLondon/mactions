import { SelectControl } from '../../../../../shared/ui/controls/select/components/SelectControl';
import type { RecordingPlayerState } from '../../../types/recording-player';

interface PlaybackSpeedProps {
  speed: number;
  setSpeed: RecordingPlayerState['setSpeed'];
}

export function PlaybackSpeed({ speed, setSpeed }: PlaybackSpeedProps) {
  return (
    <div className="replay-speed inline-flex items-center gap-1.75 text-xs text-muted max-sm:ml-auto">
      <span>Speed</span>
      <SelectControl
        className="filter-choice min-w-16.5"
        label="Playback speed"
        value={String(speed)}
        onChange={(value) => setSpeed(Number(value))}
        embedded={false}
        options={[1, 4, 10].map((value) => ({ value: String(value), label: `${value}×` }))}
      />
    </div>
  );
}
