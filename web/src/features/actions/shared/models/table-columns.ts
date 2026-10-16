import { cn } from '../../../../shared/lib/cn';
import type { ColumnBreakpoint, TableColumn } from '../types/table-column';

const hiddenClasses: Record<ColumnBreakpoint, string> = {
  md: 'max-md:hidden',
  lg: 'max-lg:hidden',
};

// A collapsed column keeps its track for rows that span every column.
const collapsedTrackClasses: Record<ColumnBreakpoint, string> = {
  md: 'max-md:collapse max-md:w-0',
  lg: 'max-lg:collapse max-lg:w-0',
};

const collapsedCellClasses: Record<ColumnBreakpoint, string> = {
  md: 'max-md:invisible max-md:p-0',
  lg: 'max-lg:invisible max-lg:p-0',
};

/** The `<col>` classes: the column's width, and how it hides below its breakpoint. */
export function trackClasses(column: TableColumn, keepHiddenTracks: boolean) {
  let hidden: string | undefined;
  if (column.hiddenBelow && keepHiddenTracks) hidden = collapsedTrackClasses[column.hiddenBelow];
  else if (column.hiddenBelow) hidden = hiddenClasses[column.hiddenBelow];
  // A flexible column without hiding gets no class attribute.
  return cn(column.width, hidden) || undefined;
}

/** How a column's header and body cells hide below its breakpoint. */
export function cellVisibilityClasses(column: TableColumn, keepHiddenTracks: boolean) {
  if (!column.hiddenBelow) return undefined;
  if (keepHiddenTracks) return collapsedCellClasses[column.hiddenBelow];
  return hiddenClasses[column.hiddenBelow];
}

/** A Runs or Job history header cell, also used by their loading skeletons. */
export function activityHeaderClasses(column: TableColumn, keepHiddenTracks: boolean) {
  return cn(
    'h-8 border-b border-b-line bg-toolbar py-1.5 text-left text-xs font-medium',
    'whitespace-nowrap text-muted max-lg:px-2.25',
    {
      'text-right tabular-nums': column.numeric,
      'overflow-visible px-1 text-clip': column.iconOnly,
    },
    column.headerClassName,
    cellVisibilityClasses(column, keepHiddenTracks),
  );
}

/** A steps table cell; numbers align right on one line. */
export function stepCellClasses(column: TableColumn) {
  return cn('h-auto border-b border-b-line bg-transparent px-0 py-1.75 whitespace-normal', {
    'text-right whitespace-nowrap tabular-nums': column.numeric,
  });
}
