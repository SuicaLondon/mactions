import type { ReactNode } from 'react';

import { cn } from '../../../../shared/lib/cn';
import { InlineLoading } from '../../../../shared/ui/loading/components/InlineLoading';

export interface RunnerListHeaderProps {
  /** The runner total beside the heading. */
  count: number;
  /** True until GitHub inventory first loads, so the total never jumps from local-only. */
  countLoading: boolean;
  /** Header controls, in display order. */
  children: ReactNode;
}

export function RunnerListHeader({ count, countLoading, children }: RunnerListHeaderProps) {
  let countLabel: ReactNode = count;
  if (countLoading) countLabel = <InlineLoading label="Loading runner count…" className="size-4" />;
  return (
    // An overlaid runner details panel starts below this header so its actions stay reachable.
    <header
      data-overlay-anchor
      className={cn(
        // On phones the reserved status line below the buttons doubles as the gap above the table.
        'mx-0 mt-0 mb-2.5 flex min-h-7.5 shrink-0 items-start',
        'max-md:mb-0',
        'justify-between gap-3',
      )}
    >
      {/* As tall as the buttons' row, so the title lines up with it when the controls wrap. */}
      <h2 className="m-0 flex min-h-7 items-center text-base font-semibold max-md:min-h-10">
        <span className="whitespace-nowrap">
          Runners <span className="ml-1.25 text-xs font-normal text-muted">{countLabel}</span>
        </span>
      </h2>
      {/* Wraps on phones so the reserved status slot takes its own line below the buttons. */}
      <div className="flex min-w-0 flex-wrap items-center justify-end gap-2.5 max-md:gap-y-0.5">
        {children}
      </div>
    </header>
  );
}
