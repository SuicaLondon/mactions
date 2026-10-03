import { cn } from '../../../../../lib/cn';
import { SkeletonLine } from '../../SkeletonLine';
import { Copy } from '../common/Copy';

export function ExecutionRows({ kind }: { kind: 'runs' | 'history' }) {
  const history = kind === 'history';
  const headingClasses = cn('h-8 border-b border-line bg-toolbar px-3 max-lg:px-2.25');
  const cellClasses = cn('h-16 bg-surface px-3 max-lg:px-2.25 max-md:h-19.25');
  return (
    <div className="overflow-hidden rounded-md border border-line">
      <table className="w-full table-fixed border-collapse text-xs">
        <colgroup>
          <col />
          <col className="w-1/4 max-md:hidden" />
          <col className="w-28 max-lg:w-26 max-md:w-23" />
          <col className="w-22 max-lg:w-19 max-md:w-17" />
          <col className="w-24 max-lg:hidden" />
          <col
            className={cn({
              'w-23.5 max-lg:w-22 max-md:w-18': history,
              'w-10.5 max-lg:w-9': !history,
            })}
          />
        </colgroup>
        <thead>
          <tr>
            <th className={headingClasses}>
              <SkeletonLine className="w-24" />
            </th>
            <th className={cn(headingClasses, 'max-md:hidden')}>
              <SkeletonLine className="w-24" />
            </th>
            <th className={headingClasses}>
              <SkeletonLine className="w-12" />
            </th>
            <th className={headingClasses}>
              <SkeletonLine className="ml-auto w-14" />
            </th>
            <th className={cn(headingClasses, 'max-lg:hidden')}>
              <SkeletonLine className="w-14" />
            </th>
            <th className={headingClasses} />
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 5 }, (_, index) => (
            <tr key={index} className="not-first:border-t not-first:border-line">
              <td className={cellClasses}>
                <Copy />
                <SkeletonLine className="mt-2 hidden w-24 max-md:block" />
              </td>
              <td className={cn(cellClasses, 'max-md:hidden')}>
                <Copy />
              </td>
              <td className={cellClasses}>
                <SkeletonLine className="w-16" />
              </td>
              <td className={cellClasses}>
                <SkeletonLine className="ml-auto w-12" />
              </td>
              <td className={cn(cellClasses, 'max-lg:hidden')}>
                <Copy />
              </td>
              <td className={cellClasses}>
                <SkeletonLine
                  className={cn({
                    'w-14': history,
                    'size-3.5': !history,
                  })}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
