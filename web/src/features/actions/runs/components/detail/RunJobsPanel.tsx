import { type ReactNode, useId } from 'react';

import { cn } from '../../../../../shared/lib/cn';
import { ChevronIcon } from '../../../../../shared/ui/icons/ChevronIcon';
import { WorkflowIcon } from '../../../../../shared/ui/icons/WorkflowIcon';
import { useRunJobsDisclosure } from '../../hooks/use-run-jobs-disclosure';

export function RunJobsPanel({
  jobCount,
  hasFailures,
  selectedJobId,
  onShowOverview,
  children,
}: {
  jobCount: number;
  hasFailures: boolean;
  /** The selected Job, or null while Overview is shown. */
  selectedJobId: number | null;
  onShowOverview: () => void;
  /** The Job list, collapsible on compact layouts. */
  children: ReactNode;
}) {
  const listId = useId();
  const disclosure = useRunJobsDisclosure(selectedJobId, hasFailures);
  return (
    <aside
      className={cn(
        'min-w-0 overflow-auto border-r border-r-line bg-canvas px-0 py-2.5',
        'max-md:overflow-visible max-md:border-r-0 max-md:border-b max-md:border-line',
      )}
      aria-label="Jobs in this run"
    >
      {/* Phones keep Overview and the Jobs disclosure on one row. */}
      <div className="flex flex-col pb-1.25 max-md:flex-row max-md:items-center">
        <button
          className={cn(
            'mx-2 my-0 flex items-center justify-start gap-2 rounded-sm',
            'border-0 bg-transparent px-2.5 py-1.75 text-xs text-muted shadow-none',
            // Foreground text keeps the selected label above 4.5:1 on its tint.
            'aria-pressed:bg-accent/10 aria-pressed:font-medium aria-pressed:text-foreground',
            'max-md:min-h-10 pointer-coarse:min-h-10',
          )}
          aria-pressed={selectedJobId === null}
          onClick={onShowOverview}
        >
          <WorkflowIcon className="size-4" />
          Overview
        </button>
        <h3 className="m-0 px-3 pt-3.25 pb-1.25 text-xs font-medium text-muted max-md:hidden">
          Jobs <span className="ml-1 text-xs font-normal">{jobCount}</span>
        </h3>
        <button
          type="button"
          className={cn(
            'mx-2 mt-1 flex items-center justify-start gap-2 rounded-sm',
            'max-md:mt-0',
            'border-0 bg-transparent px-2.5 py-1.75 text-xs font-medium text-muted',
            'shadow-none max-md:min-h-10 pointer-coarse:min-h-10',
            'md:hidden',
          )}
          aria-expanded={disclosure.open}
          aria-controls={listId}
          onClick={disclosure.toggle}
        >
          <ChevronIcon
            className={cn('size-3.5 transition-transform motion-reduce:transition-none', {
              'rotate-90': disclosure.open,
            })}
          />
          Jobs <span className="text-xs font-normal">{jobCount}</span>
        </button>
      </div>
      <div id={listId} className={cn({ 'max-md:hidden': !disclosure.open })}>
        {children}
      </div>
    </aside>
  );
}
