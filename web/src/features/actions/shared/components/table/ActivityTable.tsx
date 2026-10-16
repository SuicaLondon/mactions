import type { ReactNode } from 'react';

import { cn } from '../../../../../shared/lib/cn';
import { activityHeaderClasses, trackClasses } from '../../models/table-columns';
import type { ActivityTableLayout } from '../../types/activity-table';

/** A Runs or Job history table: the columns and headers its layout defines, around its rows. */
export function ActivityTable({
  layout,
  className,
  children,
}: {
  layout: ActivityTableLayout;
  /** Frame classes, such as the background that translucent row tints show over. */
  className?: string;
  /** The body rows, one cell per column. */
  children: ReactNode;
}) {
  return (
    <div className={cn('overflow-hidden rounded-md border border-line', className)}>
      <table className="w-full table-fixed border-collapse px-3 text-xs" aria-label={layout.label}>
        <colgroup>
          {layout.columns.map((column) => (
            <col key={column.label} className={trackClasses(column, layout.keepHiddenTracks)} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {layout.columns.map((column) => {
              let label: ReactNode = column.label;
              if (column.iconOnly) {
                label = (
                  <span className={cn('absolute size-0.25 overflow-hidden', 'whitespace-nowrap')}>
                    {column.label}
                  </span>
                );
              }
              return (
                <th
                  key={column.label}
                  scope="col"
                  className={activityHeaderClasses(column, layout.keepHiddenTracks)}
                >
                  {label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
