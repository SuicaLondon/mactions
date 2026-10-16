import { cn } from '../../../../shared/lib/cn';

// Shared by the runner grid, its rows, and its skeleton. The column templates live in theme.css.
export const runnerHeadingLayout = cn(
  'grid min-h-8 grid-cols-runners items-center gap-3',
  'border-b border-b-line bg-toolbar px-3 py-1.75 text-xs font-medium text-muted',
  '@max-5xl:grid-cols-runners-compact @max-3xl:grid-cols-runners-stacked',
  '@max-3xl:gap-x-2.5 @max-3xl:gap-y-0.5',
  // Phones and touch screens fit two 40px row actions in the last column.
  'pointer-coarse:@max-3xl:grid-cols-runners-stacked-touch',
  '@max-md:grid-cols-runners-narrow pointer-coarse:@max-md:grid-cols-runners-narrow',
);
export const runnerRowLayout = cn(
  'grid min-h-14 cursor-pointer grid-cols-runners items-center',
  'gap-3 bg-surface px-3 py-2 -outline-offset-3',
  '@max-5xl:grid-cols-runners-compact @max-3xl:grid-cols-runners-stacked',
  '@max-3xl:gap-x-2.5 @max-3xl:gap-y-0.5',
  // Phones and touch screens fit two 40px row actions in the last column.
  'pointer-coarse:@max-3xl:grid-cols-runners-stacked-touch',
  '@max-md:grid-cols-runners-narrow pointer-coarse:@max-md:grid-cols-runners-narrow',
  'not-last:border-b not-last:border-line hover:bg-activity-hover',
);
