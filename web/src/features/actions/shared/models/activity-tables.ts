import type { ActivityTableKind, ActivityTableLayout } from '../types/activity-table';

/**
 * The Runs and Job history tables. They share their first five columns and differ in the last:
 * a GitHub link icon for runs and a Run link for history. Their loading skeletons read the same
 * columns, so placeholders keep each column's width and visibility at every breakpoint.
 */
export const activityTables: Record<ActivityTableKind, ActivityTableLayout> = {
  runs: {
    label: 'Workflow runs',
    loadingLabel: 'Loading runs…',
    keepHiddenTracks: false,
    columns: [
      { label: 'Workflow run' },
      { label: 'Repository / branch', width: 'w-1/4', hiddenBelow: 'md' },
      { label: 'Result', width: 'w-28 max-lg:w-26', hiddenBelow: 'md', placeholder: 'w-16' },
      {
        label: 'Duration',
        width: 'w-22 max-lg:w-19 max-md:w-17',
        numeric: true,
        placeholder: 'ml-auto w-12',
      },
      { label: 'Started', width: 'w-32', hiddenBelow: 'lg' },
      { label: 'GitHub', width: 'w-10.5 max-lg:w-9', iconOnly: true, placeholder: 'size-3.5' },
    ],
  },
  history: {
    label: 'Job execution history',
    loadingLabel: 'Loading job history…',
    // Expanded steps rows span all six columns.
    keepHiddenTracks: true,
    columns: [
      { label: 'Execution' },
      { label: 'Runner', width: 'w-1/4', hiddenBelow: 'md' },
      // Phones stack result and duration in the execution cell instead.
      { label: 'Result', width: 'w-28 max-lg:w-26', hiddenBelow: 'md', placeholder: 'w-16' },
      {
        label: 'Duration',
        width: 'w-22 max-lg:w-19',
        numeric: true,
        hiddenBelow: 'md',
        placeholder: 'ml-auto w-12',
      },
      { label: 'Started', width: 'w-32', hiddenBelow: 'lg' },
      {
        label: 'Run',
        width: 'w-23.5 max-lg:w-22 max-md:w-16',
        headerClassName: 'px-2.5',
        placeholder: 'w-14',
      },
    ],
  },
};
