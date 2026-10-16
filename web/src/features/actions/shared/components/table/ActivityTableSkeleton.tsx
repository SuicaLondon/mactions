import type { ReactNode } from 'react';

import { cn } from '../../../../../shared/lib/cn';
import { Skeleton } from '../../../../../shared/ui/loading/components/Skeleton';
import { SkeletonLine } from '../../../../../shared/ui/loading/components/SkeletonLine';
import { SkeletonText } from '../../../../../shared/ui/loading/components/SkeletonText';
import { activityTables } from '../../models/activity-tables';
import {
  activityHeaderClasses,
  cellVisibilityClasses,
  trackClasses,
} from '../../models/table-columns';
import type { ActivityTableKind } from '../../types/activity-table';

/** The Runs or Job history table while its first page loads, with the table's own columns. */
export function ActivityTableSkeleton({ kind }: { kind: ActivityTableKind }) {
  const layout = activityTables[kind];
  return (
    <Skeleton label={layout.loadingLabel}>
      <div className="overflow-hidden rounded-md border border-line">
        <table className="w-full table-fixed border-collapse text-xs">
          <colgroup>
            {layout.columns.map((column) => (
              <col key={column.label} className={trackClasses(column, layout.keepHiddenTracks)} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {layout.columns.map((column) => {
                let header: ReactNode = <SkeletonLine className="w-16" />;
                if (column.numeric) header = <SkeletonLine className="ml-auto w-14" />;
                if (column.iconOnly) header = null;
                return (
                  <th
                    key={column.label}
                    className={activityHeaderClasses(column, layout.keepHiddenTracks)}
                  >
                    {header}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }, (_, index) => (
              <tr key={index} className="not-first:border-t not-first:border-line">
                {layout.columns.map((column, columnIndex) => {
                  let placeholder: ReactNode = <SkeletonText />;
                  if (column.placeholder)
                    placeholder = <SkeletonLine className={column.placeholder} />;
                  return (
                    <td
                      key={column.label}
                      className={cn(
                        'h-16 bg-surface px-3 max-lg:px-2.25 max-md:h-19.25',
                        cellVisibilityClasses(column, layout.keepHiddenTracks),
                      )}
                    >
                      {placeholder}
                      {/* Phones stack the row's details under its first column. */}
                      {columnIndex === 0 && (
                        <SkeletonLine className="mt-2 hidden w-24 max-md:block" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Skeleton>
  );
}
