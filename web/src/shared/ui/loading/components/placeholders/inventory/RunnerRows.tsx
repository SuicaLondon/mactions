import { cn } from '../../../../../lib/cn';
import { runnerHeadingLayout, runnerRowLayout } from '../../../../layout/list-layout';
import { SkeletonLine } from '../../SkeletonLine';
import { Copy } from '../common/Copy';

export function RunnerRows() {
  return (
    <div className="overflow-hidden rounded-md border border-line">
      <div className={runnerHeadingLayout}>
        <SkeletonLine className="w-16" />
        <SkeletonLine className="w-16 @max-md:hidden" />
        <SkeletonLine className="w-12" />
        <SkeletonLine className="w-16 @max-5xl:hidden" />
        <SkeletonLine className="w-24 @max-3xl:hidden" />
        <span />
      </div>
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className={runnerRowLayout}>
          <div
            className={cn(
              'flex min-w-0 items-center gap-2 @max-3xl:col-start-1 @max-3xl:row-start-1',
              '@max-3xl:row-end-3 @max-md:row-end-auto @max-md:min-h-9',
            )}
          >
            <SkeletonLine className="size-6 shrink-0" />
            <Copy />
          </div>
          <div
            className={cn(
              'min-w-0 @max-3xl:col-start-2 @max-3xl:row-start-1 @max-md:col-start-1',
              '@max-3xl:flex @max-3xl:h-4.5 @max-3xl:items-center @max-md:row-start-2',
              '@max-md:pl-8',
            )}
          >
            <SkeletonLine />
            <div className="mt-2 @max-3xl:hidden">
              <SkeletonLine className="w-20" />
            </div>
          </div>
          <div
            className={cn(
              'min-w-0 @max-3xl:col-start-3 @max-3xl:row-start-1 @max-3xl:row-end-3',
              '@max-md:col-start-2 @max-md:row-end-auto',
            )}
          >
            <SkeletonLine className="w-14" />
          </div>
          <SkeletonLine className="w-28 @max-5xl:hidden" />
          <div className="min-w-0 @max-3xl:col-start-2 @max-3xl:row-start-2 @max-md:col-end-4">
            <SkeletonLine />
          </div>
          <div
            className={cn(
              'flex justify-end @max-3xl:col-start-4 @max-3xl:row-start-1 @max-3xl:row-end-3',
              '@max-md:col-start-3 @max-md:row-end-auto',
            )}
          >
            <SkeletonLine className="size-6" />
          </div>
        </div>
      ))}
    </div>
  );
}
