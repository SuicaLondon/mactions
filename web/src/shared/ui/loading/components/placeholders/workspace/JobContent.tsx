import { cn } from '../../../../../lib/cn';
import { SkeletonLine } from '../../SkeletonLine';
import { Steps } from '../common/Steps';

export function JobContent() {
  return (
    <div className="@container/job-detail px-4.5 pt-3 pb-4.5 max-lg:pt-2.5">
      <div className="flex min-h-8.5 items-center justify-between gap-3.5 border-b border-line pb-2">
        <SkeletonLine className="h-3.5 w-45" />
        <SkeletonLine className="h-6.75 w-35" />
      </div>
      <div className="flex min-h-10.25 items-center gap-3 px-1.75 py-1.75">
        <SkeletonLine className="w-16" />
        <SkeletonLine className="w-12" />
        <SkeletonLine className="ml-auto w-37.5" />
      </div>
      <div
        className={cn(
          'mt-1 mb-3 grid grid-cols-2 gap-x-6 gap-y-2.25 border-t border-line pt-2.5',
          'max-lg:gap-x-3.5 max-lg:gap-y-1.25 @max-lg/job-detail:grid-cols-1',
        )}
      >
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="flex min-h-4.5 items-center gap-1.75">
            <SkeletonLine className="w-14 shrink-0" />
            <SkeletonLine className="w-28" />
          </div>
        ))}
      </div>
      <div className="border-t border-line pt-2.25">
        <SkeletonLine className="mb-2 w-28" />
        <Steps />
      </div>
    </div>
  );
}
