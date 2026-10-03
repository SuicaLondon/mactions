import type { JobStep } from '../../../../../shared/api/types';
import { cn } from '../../../../../shared/lib/cn';
import { ExternalLinkIcon } from '../../../../../shared/ui/icons/navigation/ExternalLinkIcon';
import { ClockIcon } from '../../../../../shared/ui/icons/status/ClockIcon';
import { TerminalIcon } from '../../../../../shared/ui/icons/system/TerminalIcon';
import { type JobWorkspaceDetail } from './JobWorkspaceDetail';

export function JobWorkspaceHeader({
  job,
  step,
  fullLog,
  setFullLog,
  onOpenHistory,
}: {
  job: Parameters<typeof JobWorkspaceDetail>[0]['job'];
  step: JobStep | undefined;
  fullLog: boolean;
  setFullLog: React.Dispatch<React.SetStateAction<boolean>>;
  onOpenHistory: Parameters<typeof JobWorkspaceDetail>[0]['onOpenHistory'];
}) {
  let fullLogLabel = 'Full job log';
  if (fullLog) fullLogLabel = 'Hide full log';
  return (
    <header
      className={cn(
        'job-workspace-heading flex min-h-8.5 shrink-0 items-center justify-between',
        'gap-3.5 border-b border-b-line pb-2 @max-lg/job-detail:flex-wrap',
        '@max-lg/job-detail:gap-2',
      )}
    >
      <div className="job-workspace-title flex min-w-0 items-center gap-2">
        <span
          className={cn(
            'workspace-context-label shrink-0 text-xs font-medium whitespace-nowrap',
            'text-muted @max-lg/job-detail:hidden',
          )}
        >
          Job
        </span>
        <h3
          className={cn(
            'm-0 overflow-hidden text-sm leading-snug font-semibold text-ellipsis',
            'whitespace-nowrap @max-lg/job-detail:text-xs',
          )}
          title={job.name}
        >
          {job.name}
        </h3>
      </div>
      <div
        className={cn(
          'job-workspace-actions flex shrink-0 items-center gap-2.25',
          '@max-lg/job-detail:ml-auto @max-lg/job-detail:gap-1',
        )}
      >
        {!step && (
          <button
            className={cn(
              'min-h-6.75 px-2 py-1 text-xs @max-lg/job-detail:px-1.25',
              '@max-lg/job-detail:py-0.75 @max-lg/job-detail:text-xs',
            )}
            aria-expanded={fullLog}
            aria-controls={`job-${job.id}-full-log`}
            onClick={() => setFullLog((value) => !value)}
          >
            <TerminalIcon className="size-3.25" />
            {fullLogLabel}
          </button>
        )}
        <button
          className={cn(
            'min-h-6.75 px-2 py-1 text-xs @max-lg/job-detail:px-1.25',
            '@max-lg/job-detail:py-0.75 @max-lg/job-detail:text-xs',
          )}
          onClick={() => onOpenHistory(job)}
        >
          <ClockIcon className="size-3.25" />
          Job history
        </button>
        <a
          className="inline-grid h-6.75 w-6 place-items-center text-muted @max-lg/job-detail:hidden"
          href={job.url}
          target="_blank"
          rel="noreferrer"
          aria-label="View job on GitHub"
        >
          <ExternalLinkIcon className="size-3.25" />
        </a>
      </div>
    </header>
  );
}
