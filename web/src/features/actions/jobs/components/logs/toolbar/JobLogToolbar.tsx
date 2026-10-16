import type { ReactNode } from 'react';

import { cn } from '../../../../../../shared/lib/cn';
import { UpdateFailedIndicator } from '../../../../../../shared/ui/feedback/components/UpdateFailedIndicator';
import { ExternalLinkIcon } from '../../../../../../shared/ui/icons/ExternalLinkIcon';
import { RefreshIcon } from '../../../../../../shared/ui/icons/RefreshIcon';
import { TerminalIcon } from '../../../../../../shared/ui/icons/TerminalIcon';
import type { RefreshState } from '../../../../shared/types/refresh-state';
import { JobLogActionsMenu } from './JobLogActionsMenu';

/**
 * The log toolbar: what the output covers, the search, the viewer's actions, the refresh status,
 * and a GitHub link. Wider viewports show one row. Phones show the label above a single sticky
 * row of search controls, with the actions behind a "More" menu.
 */
export function JobLogToolbar({
  outputLabel,
  scopeName,
  logLabel,
  githubUrl,
  refresh,
  search,
  children,
}: {
  outputLabel: string;
  /** The step or job name the output belongs to. */
  scopeName: string;
  /** The output's accessible name, such as "Logs for Build"; it names the refresh action. */
  logLabel: string;
  githubUrl: string;
  /** Refreshes live output; null for recorded replay output, which never refreshes. */
  refresh: RefreshState | null;
  search: ReactNode;
  /** The wrap and download actions, in order. */
  children: ReactNode;
}) {
  const refreshLabel = `Refresh ${logLabel.toLowerCase()}`;
  let refreshControl = <span className="md:order-1">Recorded output</span>;
  if (refresh) {
    // Named "Refresh log" so it reads apart from the page header's Refresh.
    refreshControl = (
      <button
        type="button"
        className={cn(
          'min-h-6 rounded-md border border-slate-700 bg-slate-800 py-0.75 text-xs',
          'text-slate-100 shadow-none max-md:min-h-10 md:order-1 pointer-coarse:min-h-10',
        )}
        aria-label={refreshLabel}
        title={refreshLabel}
        disabled={refresh.refreshing}
        onClick={refresh.onRefresh}
      >
        <RefreshIcon className="size-3.5 text-slate-300" />
        Refresh log
      </button>
    );
  }
  return (
    <div
      className={cn(
        'flex shrink-0 flex-wrap items-center justify-between gap-2',
        'border-b border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs text-slate-100',
        // Phones lay the label and the sticky row out directly in the viewer.
        'max-md:contents',
      )}
    >
      <span
        className={cn(
          'flex min-w-0 flex-wrap items-center gap-2.5',
          'max-md:shrink-0 max-md:bg-slate-900 max-md:px-3.5 max-md:pt-2.5 max-md:pb-1',
        )}
      >
        <TerminalIcon className="size-3.75 text-sky-300" />
        <span>{outputLabel}</span>
        <strong className={cn('max-w-95 truncate text-xs', 'text-slate-400')}>{scopeName}</strong>
      </span>
      <div
        className={cn(
          'flex min-w-0 flex-wrap items-center gap-2.5',
          // Phones scroll the page, not the output, so the controls stay in reach after a jump.
          'max-md:sticky max-md:top-0 max-md:z-10 max-md:w-full max-md:shrink-0',
          'max-md:flex-nowrap max-md:gap-1.5 max-md:border-b max-md:border-slate-700',
          'max-md:bg-slate-900 max-md:px-3 max-md:pt-1 max-md:pb-1.5',
        )}
      >
        {search}
        {/*
          The reserved "Update failed" slot. Wide toolbars order it just before Refresh log. Phones
          float it below the sticky search row, so its reserved width never squeezes the search
          field and a failure stays in view while the page scrolls.
        */}
        {!!refresh && (
          <UpdateFailedIndicator
            tone="dark"
            className={cn(
              'md:order-1',
              'max-md:absolute max-md:top-full max-md:right-3 max-md:mt-1 max-md:rounded-md',
              'max-md:border max-md:border-slate-700 max-md:bg-slate-900 max-md:px-2',
              'max-md:py-1',
            )}
            error={refresh.error}
            retrying={refresh.refreshing}
            onRetry={refresh.onRefresh}
          />
        )}
        <JobLogActionsMenu>
          {children}
          {/* `md:order-1` keeps Refresh log, or the recorded note, after the reserved status. */}
          {refreshControl}
          <a
            className={cn(
              'inline-flex items-center gap-1 text-sky-300 no-underline md:order-1',
              'max-md:min-h-10 max-md:justify-center pointer-coarse:min-h-10',
            )}
            href={githubUrl}
            target="_blank"
            rel="noreferrer"
          >
            GitHub
            <ExternalLinkIcon className="size-3.75 text-sky-300" />
          </a>
        </JobLogActionsMenu>
      </div>
    </div>
  );
}
