import type { ReactNode } from 'react';

import { cn } from '../../../../../shared/lib/cn';
import { stepColumns } from '../../models/steps-table';
import { stepCellClasses } from '../../models/table-columns';

/** One step of a `StepsTable`: its name as the row header, then its result and duration. */
export function StepsTableRow({
  name,
  result,
  duration,
}: {
  name: ReactNode;
  result: ReactNode;
  duration: string;
}) {
  return (
    <tr className="bg-transparent">
      <th
        scope="row"
        className={cn(stepCellClasses(stepColumns.step), 'text-xs font-normal text-foreground')}
      >
        {name}
      </th>
      <td className={cn(stepCellClasses(stepColumns.result), 'text-muted')}>{result}</td>
      <td className={cn(stepCellClasses(stepColumns.duration), 'text-muted')}>{duration}</td>
    </tr>
  );
}
