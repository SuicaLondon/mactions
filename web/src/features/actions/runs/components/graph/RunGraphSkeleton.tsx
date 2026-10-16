import { cn } from '../../../../../shared/lib/cn';
import { Skeleton } from '../../../../../shared/ui/loading/components/Skeleton';
import { SkeletonLine } from '../../../../../shared/ui/loading/components/SkeletonLine';

/**
 * Mirrors RunGraph's heading and typical shape: on wider screens a root job feeding a column of
 * groups inside the graph viewport, on phones the stacked dependency levels. The loaded pipeline
 * replaces the skeleton without moving content below it.
 */
export function RunGraphSkeleton() {
  return (
    <Skeleton label="Loading workflow dependencies…">
      {/* The heading's padding and 20px content row, as in RunGraph. */}
      <div className="flex items-center gap-2.5 px-5 py-3.75 max-md:p-3">
        <div className="flex h-5 items-center gap-2.5">
          <SkeletonLine className="h-3.5 w-16" />
          <SkeletonLine className="w-28" />
        </div>
      </div>
      <div
        className={cn(
          'flex min-h-60 items-center gap-18 overflow-hidden border-y border-line',
          'graph-grid p-6 max-md:hidden',
        )}
      >
        {/* One root node beside a column of stacked group cards, like most pipelines. */}
        <div className="h-19 w-60 shrink-0 rounded-md border border-line bg-surface" />
        <div className="flex shrink-0 flex-col gap-6">
          {Array.from({ length: 2 }, (_, index) => (
            <div key={index} className="h-19 w-60 rounded-md border border-line bg-surface" />
          ))}
        </div>
      </div>
      {/* Phones: the same root and groups as RunGraphLevels' stacked full-width cards. */}
      <div
        className={cn('hidden flex-col gap-4 border-y border-line bg-canvas p-3', 'max-md:flex')}
      >
        {[1, 2].map((level) => (
          <div key={level} className="flex flex-col gap-2">
            <SkeletonLine className="w-12" />
            {Array.from({ length: level }, (_, index) => (
              <div key={index} className="h-19 rounded-md border border-line bg-surface" />
            ))}
          </div>
        ))}
      </div>
    </Skeleton>
  );
}
