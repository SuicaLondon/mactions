import { cn } from '../../../../../shared/lib/cn';
import { ChevronIcon } from '../../../../../shared/ui/icons/ChevronIcon';
import type { JobSummary } from '../../../data/types/activity-types';
import { isFailed } from '../../../shared/models/activity-status';

export function RunFailureCallout({
  jobs,
  onSelect,
  className,
}: {
  jobs: JobSummary[];
  onSelect: (jobId: number) => void;
  className?: string;
}) {
  const failed = jobs.filter(isFailed);
  if (!failed.length) return null;
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-2 gap-y-1 border-b',
        'border-line px-5 py-2 text-xs max-md:px-3',
        className,
      )}
      role="group"
      aria-label="Failed jobs"
    >
      <span className="font-medium text-activity-failure">{failed.length} failed:</span>
      {failed.map((job) => (
        <button
          key={job.id}
          type="button"
          className={cn(
            'inline-flex min-w-0 items-center gap-1 border-0 bg-transparent p-0 text-xs',
            'text-foreground shadow-none hover:text-accent max-md:min-h-10',
            'pointer-coarse:min-h-10',
          )}
          aria-label={`Open failed job ${job.name}`}
          onClick={() => onSelect(job.id)}
        >
          <span className="truncate">{job.name}</span>
          <ChevronIcon className="size-3 shrink-0" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
