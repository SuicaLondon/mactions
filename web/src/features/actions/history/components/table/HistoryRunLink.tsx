import { cn } from '../../../../../shared/lib/cn';
import { ChevronIcon } from '../../../../../shared/ui/icons/ChevronIcon';
import { ExternalLinkIcon } from '../../../../../shared/ui/icons/ExternalLinkIcon';
import { jobRun } from '../../../data/models/activity-data';
import { type JobSummary, type WorkflowRun } from '../../../data/types/activity-types';

/** Opens the execution's run in place when the page can, or on GitHub. */
export function HistoryRunLink({
  job,
  onOpenRun,
}: {
  job: JobSummary;
  /** Opens the run in place; without it the link goes to GitHub. */
  onOpenRun?: (run: WorkflowRun) => void;
}) {
  const run = jobRun(job);
  if (run && onOpenRun)
    return (
      <button
        className={cn(
          'inline-flex items-center gap-1 border-0 bg-transparent px-0 py-1 text-xs',
          'text-accent no-underline shadow-none',
          'max-md:min-h-10 max-md:min-w-10 pointer-coarse:min-h-10',
        )}
        aria-label={`Open run #${job.run_number}`}
        onClick={() => onOpenRun(run)}
      >
        Open
        <ChevronIcon className="size-3" />
      </button>
    );
  return (
    <a
      className={cn(
        'inline-flex items-center gap-1 border-0 bg-transparent px-0 py-1 text-xs',
        'text-accent no-underline shadow-none',
        'max-md:min-h-10 max-md:min-w-10 pointer-coarse:min-h-10',
      )}
      href={job.run_url || job.url}
      target="_blank"
      rel="noreferrer"
      aria-label={`Open run #${job.run_number} on GitHub`}
    >
      GitHub
      <ExternalLinkIcon className="size-3" />
    </a>
  );
}
