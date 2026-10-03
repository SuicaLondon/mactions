import { cn } from '../../../../../lib/cn';
import { SkeletonLine } from '../../SkeletonLine';

export function Steps() {
  return (
    <div>
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="flex min-h-9.5 items-center gap-2 border-b border-line py-1.75">
          <SkeletonLine className="size-3.5 shrink-0" />
          <SkeletonLine
            className={cn({
              'w-35': index % 2,
              'w-60': !(index % 2),
            })}
          />
          <SkeletonLine className="ml-auto w-12" />
        </div>
      ))}
    </div>
  );
}
