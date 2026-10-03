import { cn } from '../../lib/cn';
// Shared by runner rows and their loading placeholders.
export const runnerHeadingLayout = cn(
  'runner-grid-heading grid min-h-8',
  'grid-cols-[minmax(--spacing(42.5),_.8fr)_minmax(--spacing(45),_.9fr)_--spacing(27.5)_minmax(--spacing(32.5),_.7fr)_minmax(--spacing(60),_1.25fr)_--spacing(14)]',
  'items-center gap-3 border-b border-b-line bg-toolbar px-3 py-1.75 text-xs',
  'font-medium text-muted',
  '@max-5xl:grid-cols-[minmax(--spacing(40),_.8fr)_minmax(--spacing(37.5),_.8fr)_--spacing(26.25)_minmax(--spacing(50),_1.2fr)_--spacing(14)]',
  '@max-3xl:grid-cols-[minmax(--spacing(32.5),_.8fr)_minmax(0,_1.2fr)_--spacing(17.5)_--spacing(12)]',
  '@max-3xl:gap-x-2.5 @max-3xl:gap-y-0.5',
  '@max-md:grid-cols-[minmax(0,_1fr)_--spacing(17.5)_--spacing(12)]',
);
export const runnerRowLayout = cn(
  'runner-grid-row grid min-h-14 cursor-pointer',
  'grid-cols-[minmax(--spacing(42.5),_.8fr)_minmax(--spacing(45),_.9fr)_--spacing(27.5)_minmax(--spacing(32.5),_.7fr)_minmax(--spacing(60),_1.25fr)_--spacing(14)]',
  'items-center gap-3 bg-surface px-3 py-2 -outline-offset-3',
  '@max-5xl:grid-cols-[minmax(--spacing(40),_.8fr)_minmax(--spacing(37.5),_.8fr)_--spacing(26.25)_minmax(--spacing(50),_1.2fr)_--spacing(14)]',
  '@max-3xl:min-h-14',
  '@max-3xl:grid-cols-[minmax(--spacing(32.5),_.8fr)_minmax(0,_1.2fr)_--spacing(17.5)_--spacing(12)]',
  '@max-3xl:gap-x-2.5 @max-3xl:gap-y-0.5 @max-3xl:py-2',
  '@max-md:grid-cols-[minmax(0,_1fr)_--spacing(17.5)_--spacing(12)]',
  'not-last:border-b not-last:border-line hover:bg-activity-hover',
);
