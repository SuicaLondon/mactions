import { cn } from '../../../../../shared/lib/cn';
import { InfoIcon } from '../../../../../shared/ui/icons/status/InfoIcon';

export function RunnerInspectorEmpty() {
  return (
    <div
      id="inspector-empty"
      className={cn(
        'flex min-h-62.5 flex-1 flex-col items-center',
        'justify-center text-center text-xs leading-relaxed text-muted',
      )}
    >
      <InfoIcon className="size-7 stroke-2 opacity-70" />
      <p>
        Select a runner to view its
        <br />
        configuration and controls.
      </p>
    </div>
  );
}
