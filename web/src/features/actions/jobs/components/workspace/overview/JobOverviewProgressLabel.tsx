import { type JobStep } from '../../../../../../shared/api/types';
import { cn } from '../../../../../../shared/lib/cn';

/** The completion text, or a button that opens the first failed step's log. */
export function JobOverviewProgressLabel({
  label,
  failedStep,
  onSelectStep,
}: {
  label: string;
  failedStep: JobStep | undefined;
  onSelectStep: (number: number) => void;
}) {
  if (!failedStep) {
    return (
      <span className="min-w-0 truncate" title={label}>
        {label}
      </span>
    );
  }
  return (
    <button
      className={cn(
        'min-h-7 max-w-full min-w-0 justify-self-end rounded-md border border-danger/40',
        'bg-transparent px-2 py-0.5 text-xs font-medium text-danger shadow-none',
        'hover:bg-danger/10 max-md:min-h-10 pointer-coarse:min-h-10',
      )}
      title={`Show the log for step ${failedStep.number}`}
      onClick={() => onSelectStep(failedStep.number)}
    >
      <span className="min-w-0 truncate">{label}</span>
    </button>
  );
}
