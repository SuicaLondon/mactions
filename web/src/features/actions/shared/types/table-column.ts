/** A viewport breakpoint below which a table column hides. */
export type ColumnBreakpoint = 'md' | 'lg';

/** One column of an activity or steps table: its header and how it sizes, aligns, and hides. */
export interface TableColumn {
  label: string;
  /** Classes sizing the column track, such as `w-28 max-lg:w-26`; columns without one share the rest. */
  width?: string;
  /** Right-aligns the column, for numbers. */
  numeric?: boolean;
  /** Hides the column below this breakpoint. */
  hiddenBelow?: ColumnBreakpoint;
  /** Keeps the header for screen readers only, for a column of icon links. */
  iconOnly?: boolean;
  /** Extra header classes, such as padding that matches the column's cells. */
  headerClassName?: string;
  /** Classes for the loading skeleton's line in this column; activity tables show two lines without one. */
  placeholder?: string;
}
