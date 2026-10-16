import { cn } from '../../../lib/cn';
import { SkeletonLine } from './SkeletonLine';

/** Log output lines, optionally with a line-number gutter. */
export function LogLinesSkeleton({
  lineNumbers = false,
  className,
}: {
  lineNumbers?: boolean;
  /** Spacing around and between the lines. */
  className?: string;
}) {
  return (
    <div className={cn('grid content-start gap-2', className)}>
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="flex min-h-2.5 gap-3.5">
          {lineNumbers && <SkeletonLine className="w-8 shrink-0" />}
          <SkeletonLine className={cn({ 'w-60': index % 3, 'w-35': !(index % 3) })} />
        </div>
      ))}
    </div>
  );
}
