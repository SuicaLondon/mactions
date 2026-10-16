import { type ReactNode } from 'react';

import { cn } from '../../../../../shared/lib/cn';
import { InlineLoading } from '../../../../../shared/ui/loading/components/InlineLoading';

export function RunListHeader({
  runnerName,
  countLoading,
  runCount,
  refreshNote,
  children,
}: {
  runnerName?: string;
  countLoading: boolean;
  runCount: number;
  refreshNote: string | null;
  /** The list controls, beside the title. */
  children: ReactNode;
}) {
  let suffix = '';
  if (runnerName) suffix = ` for ${runnerName}`;
  let runUnit = 'runs';
  if (runCount === 1) runUnit = 'run';
  let count = (
    <>
      {runCount} {runUnit} loaded
    </>
  );
  if (countLoading) count = <InlineLoading label="Loading run count…" className="h-4.5 w-24" />;
  return (
    <header
      className={cn(
        // On phones the reserved status line below Refresh doubles as the gap above the table.
        'mx-0 mt-0 mb-2.5 flex min-h-7.5 items-start max-md:mb-0',
        'justify-between gap-3',
      )}
    >
      {/* Matches the Runners header: the loaded count sits beside the title. */}
      <div className="min-w-0 flex-1">
        <div className="flex min-h-7 items-center gap-1.25 max-md:min-h-10">
          {/* Shows the nav name, matching "Runners"; the accessible name keeps "Workflow runs". */}
          <h2
            className="m-0 truncate text-base font-semibold"
            aria-label={`Workflow runs${suffix}`}
          >
            Runs
            {suffix}
          </h2>
          <span className="shrink-0 text-xs whitespace-nowrap text-muted">{count}</span>
        </div>
        {!!refreshNote && <span className="mt-1 block text-xs text-muted">{refreshNote}</span>}
      </div>
      {children}
    </header>
  );
}
