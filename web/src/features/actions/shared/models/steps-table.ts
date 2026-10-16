import type { TableColumn } from '../types/table-column';

/** The columns of a job's steps, in the job overview and in an execution's history. */
export const stepColumns = {
  step: { label: 'Step', width: 'w-2/3' },
  result: { label: 'Result', placeholder: 'w-16' },
  duration: { label: 'Duration', numeric: true, placeholder: 'ml-auto w-12' },
} satisfies Record<string, TableColumn>;
