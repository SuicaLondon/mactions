import { cn } from '../../../../../shared/lib/cn';
import { Skeleton } from '../../../../../shared/ui/loading/components/Skeleton';
import { SkeletonLine } from '../../../../../shared/ui/loading/components/SkeletonLine';

/** The Jobs column beside the Overview graph area, filling the run workspace. */
export function RunDetailSkeleton() {
  return (
    <Skeleton label="Loading jobs…" className="min-h-0 flex-1">
      <div
        className={cn(
          'grid min-h-0 flex-1 grid-cols-run-jobs max-lg:grid-cols-run-jobs-compact',
          'max-sm:grid-cols-run-jobs-narrow',
        )}
      >
        <div className="min-w-0 border-r border-line bg-canvas px-3 py-2.5">
          <div className="mx-2 flex min-h-8 items-center px-2.5">
            <SkeletonLine className="w-20" />
          </div>
          <div className="pt-3.25 pb-1.25">
            <SkeletonLine className="w-12" />
          </div>
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="flex min-h-10 items-center gap-2 px-2">
              <SkeletonLine className="size-3.5 shrink-0" />
              <SkeletonLine />
            </div>
          ))}
        </div>
        <div className="min-w-0">
          <div className="flex min-h-14 items-center gap-2.5 px-5 py-3.75 max-md:p-3">
            <SkeletonLine className="h-3.5 w-16" />
            <SkeletonLine className="w-28" />
          </div>
          <div className="px-5 py-4 max-md:px-3">
            <div className="h-40 max-w-175 rounded-md border border-line bg-canvas" />
          </div>
        </div>
      </div>
    </Skeleton>
  );
}
