import { cn } from '../../../../../../shared/lib/cn';
import { ChevronIcon } from '../../../../../../shared/ui/icons/navigation/ChevronIcon';
import { ExternalLinkIcon } from '../../../../../../shared/ui/icons/navigation/ExternalLinkIcon';
import { type jobRun } from '../../../../data/models/activity-data';
import { type HistoryItem } from './HistoryItem';

export function HistoryRunLink({
  run,
  onOpenRun,
  job,
}: {
  run: ReturnType<typeof jobRun>;
  onOpenRun: Parameters<typeof HistoryItem>[0]['onOpenRun'];
  job: Parameters<typeof HistoryItem>[0]['job'];
}) {
  if (run && onOpenRun)
    return (
      <button
        className={cn(
          'inline-flex items-center gap-1 border-0 bg-transparent px-0 py-1 text-xs',
          'text-accent no-underline shadow-none',
        )}
        onClick={() => onOpenRun(run)}
      >
        View run
        <ChevronIcon className="size-3" />
      </button>
    );
  return (
    <a
      className={cn(
        'inline-flex items-center gap-1 border-0 bg-transparent px-0 py-1 text-xs',
        'text-accent no-underline shadow-none',
      )}
      href={job.run_url || job.url}
      target="_blank"
      rel="noreferrer"
    >
      GitHub
      <ExternalLinkIcon className="size-3" />
    </a>
  );
}
