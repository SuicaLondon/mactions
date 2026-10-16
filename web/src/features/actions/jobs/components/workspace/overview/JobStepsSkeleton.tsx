import { cn } from '../../../../../../shared/lib/cn';
import { SkeletonLine } from '../../../../../../shared/ui/loading/components/SkeletonLine';

/** Rows of the Job steps table. Decorative: wrap it in `Skeleton` to announce loading. */
export function JobStepsSkeleton() {
  return (
    <div>
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="flex min-h-9.5 items-center gap-2 border-b border-line py-1.75">
          <SkeletonLine className="size-3.5 shrink-0" />
          <SkeletonLine className={cn({ 'w-35': index % 2, 'w-60': !(index % 2) })} />
          <SkeletonLine className="ml-auto w-12" />
        </div>
      ))}
    </div>
  );
}
