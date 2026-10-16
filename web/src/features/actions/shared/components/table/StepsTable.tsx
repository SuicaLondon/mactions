import type { ReactNode } from 'react';

import { cn } from '../../../../../shared/lib/cn';
import { stepColumns } from '../../models/steps-table';
import { stepCellClasses } from '../../models/table-columns';
import type { TableColumn } from '../../types/table-column';

/** A job's steps with their results and durations; rows are `StepsTableRow`s. */
export function StepsTable({
  caption,
  captionClassName,
  children,
}: {
  caption: ReactNode;
  /** Caption classes, such as a divider from the content above. */
  captionClassName?: string;
  children: ReactNode;
}) {
  const columns: TableColumn[] = Object.values(stepColumns);
  return (
    <table className="w-full table-auto border-collapse text-xs">
      <caption className={cn('px-0 pt-2.5 pb-1.75 text-left text-xs text-muted', captionClassName)}>
        {caption}
      </caption>
      <colgroup>
        {columns.map((column) => (
          <col key={column.label} className={column.width} />
        ))}
      </colgroup>
      <thead className="static">
        <tr className="bg-transparent">
          {columns.map((column) => (
            <th
              key={column.label}
              scope="col"
              className={cn(stepCellClasses(column), 'text-muted')}
            >
              {column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}
