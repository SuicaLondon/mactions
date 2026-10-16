import type { ReactNode } from 'react';

import type { Job } from '../../../../../shared/api/types';
import { cn } from '../../../../../shared/lib/cn';
import { ClockIcon } from '../../../../../shared/ui/icons/ClockIcon';
import { ExternalLinkIcon } from '../../../../../shared/ui/icons/ExternalLinkIcon';
import { TerminalIcon } from '../../../../../shared/ui/icons/TerminalIcon';

export function JobWorkspaceHeader({
  job,
  showingOverview,
  fullLogOpen,
  refreshIndicator,
  onToggleFullLog,
  onOpenHistory,
}: {
  job: Job;
  /** The job overview is shown rather than one step, so the full log can open. */
  showingOverview: boolean;
  fullLogOpen: boolean;
  /** Shown before the actions, such as a failed background refresh. */
  refreshIndicator?: ReactNode;
  onToggleFullLog: () => void;
  onOpenHistory: (job: Job) => void;
}) {
  let fullLogLabel = 'Full job log';
  if (fullLogOpen) fullLogLabel = 'Hide full log';
  return (
    <header
      className={cn(
        'flex min-h-8.5 shrink-0 items-center justify-between',
        'gap-3.5 border-b border-b-line pb-2 @max-lg/job-detail:flex-wrap',
        '@max-lg/job-detail:gap-2',
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <h3
          className={cn(
            'm-0 overflow-hidden text-sm/snug font-semibold text-ellipsis',
            'whitespace-nowrap @max-lg/job-detail:text-xs',
          )}
          title={job.name}
        >
          {job.name}
        </h3>
      </div>
      <div
        className={cn(
          'flex shrink-0 items-center gap-2.25',
          '@max-lg/job-detail:ml-auto @max-lg/job-detail:gap-1',
        )}
      >
        {refreshIndicator}
        {!!showingOverview && (
          <button
            className={cn(
              'min-h-6.75 px-2 py-1 text-xs @max-lg/job-detail:px-1.25',
              '@max-lg/job-detail:py-0.75 @max-lg/job-detail:text-xs',
              'max-md:min-h-10 pointer-coarse:min-h-10',
            )}
            aria-expanded={fullLogOpen}
            aria-controls={`job-${job.id}-full-log`}
            onClick={onToggleFullLog}
          >
            <TerminalIcon className="size-3.25" />
            {fullLogLabel}
          </button>
        )}
        <button
          className={cn(
            'min-h-6.75 px-2 py-1 text-xs @max-lg/job-detail:px-1.25',
            '@max-lg/job-detail:py-0.75 @max-lg/job-detail:text-xs',
            'max-md:min-h-10 pointer-coarse:min-h-10',
          )}
          onClick={() => onOpenHistory(job)}
        >
          <ClockIcon className="size-3.25" />
          Job history
        </button>
        <a
          className={cn(
            'inline-grid h-6.75 w-6 place-items-center text-muted @max-lg/job-detail:hidden',
            'pointer-coarse:size-10',
          )}
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
