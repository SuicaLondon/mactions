import { cn } from '../../../../../lib/cn';
import { SkeletonLine } from '../../SkeletonLine';
import { LogLoadingLines } from './LogLoadingLines';

export function LogContent({ runner = false }: { runner?: boolean }) {
  return (
    <div
      className={cn('grid content-start', { 'gap-2': runner, 'gap-2.5 px-4.5 py-3.5': !runner })}
    >
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="flex min-h-2.5 gap-3.5">
          <LogLoadingLines runner={runner} />
          <SkeletonLine
            className={cn({
              'w-60': index % 3,
              'w-35': !(index % 3),
            })}
          />
        </div>
      ))}
    </div>
  );
}
