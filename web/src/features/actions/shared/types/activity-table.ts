import type { TableColumn } from './table-column';

export type ActivityTableKind = 'runs' | 'history';

/** The columns of a Runs or Job history table, shared by the table and its loading skeleton. */
export interface ActivityTableLayout {
  /** The table's accessible name. */
  label: string;
  /** Announced while the first page loads. */
  loadingLabel: string;
  /** Hidden columns keep their tracks, so a row spanning every column stays aligned. */
  keepHiddenTracks: boolean;
  columns: TableColumn[];
}
