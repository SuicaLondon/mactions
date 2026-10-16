import { Skeleton } from '../../../../../shared/ui/loading/components/Skeleton';
import { SkeletonLine } from '../../../../../shared/ui/loading/components/SkeletonLine';

/** The repository line above the workflow graph. */
export function RunnerJobsSkeleton() {
  return (
    <Skeleton label="Loading runner jobs…">
      <div className="flex min-h-14 items-center gap-2.5 px-5 py-3.75 max-md:p-3">
        <SkeletonLine className="h-3.5 w-16" />
        <SkeletonLine className="w-28" />
      </div>
      <div className="px-5 py-4 max-md:px-3">
        <div className="h-40 max-w-175 rounded-md border border-line bg-canvas" />
      </div>
    </Skeleton>
  );
}
