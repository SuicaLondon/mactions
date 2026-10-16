import { cn } from '../../../../../../shared/lib/cn';
import { Skeleton } from '../../../../../../shared/ui/loading/components/Skeleton';
import { SkeletonLine } from '../../../../../../shared/ui/loading/components/SkeletonLine';
import { stepColumns } from '../../../../shared/models/steps-table';
import { stepCellClasses } from '../../../../shared/models/table-columns';
import type { TableColumn } from '../../../../shared/types/table-column';

export function HistoricalStepsSkeleton() {
  const columns: TableColumn[] = Object.values(stepColumns);
  return (
    <Skeleton label="Loading historical steps…">
      <div className="flex h-9 items-center">
        <SkeletonLine className="w-40" />
      </div>
      <table className="w-full table-fixed border-collapse">
        <colgroup>
          {columns.map((column) => (
            <col key={column.label} className={column.width} />
          ))}
        </colgroup>
        <tbody>
          {Array.from({ length: 6 }, (_, index) => (
            <tr key={index}>
              {columns.map((column) => (
                <td key={column.label} className={cn(stepCellClasses(column), 'h-9.5')}>
                  <SkeletonLine className={column.placeholder} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Skeleton>
  );
}
