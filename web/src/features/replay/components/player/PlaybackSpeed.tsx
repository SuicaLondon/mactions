import { SelectControl } from '../../../../shared/ui/controls/select/components/SelectControl';

interface PlaybackSpeedProps {
  speed: number;
  onSpeedChange: (speed: number) => void;
}

export function PlaybackSpeed({ speed, onSpeedChange }: PlaybackSpeedProps) {
  return (
    <div className="inline-flex items-center gap-1.75 text-xs text-muted max-sm:ml-auto">
      <span>Speed</span>
      <SelectControl
        className="min-w-16.5"
        label="Playback speed"
        value={String(speed)}
        onChange={(value) => onSpeedChange(Number(value))}
        variant="toolbar"
        options={[1, 4, 10].map((value) => ({ value: String(value), label: `${value}×` }))}
      />
    </div>
  );
}
