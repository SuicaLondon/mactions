import { SkeletonLine } from '../../SkeletonLine';
import { LogContent } from '../common/LogContent';

export function StepContent() {
  return (
    <div className="flex h-full min-h-75 flex-1 flex-col px-4.5 pt-3 pb-4.5 max-lg:pt-2.5">
      <div className="flex min-h-8.5 items-center justify-between border-b border-line pb-2">
        <SkeletonLine className="h-3.5 w-45" />
        <SkeletonLine className="h-6.75 w-28" />
      </div>
      <div className="flex min-h-12 flex-wrap items-center justify-between gap-2 py-2.5">
        <SkeletonLine className="h-3.5 w-45" />
        <SkeletonLine className="w-60" />
      </div>
      <div className="min-h-0 flex-1 bg-slate-950">
        <div className="flex min-h-10 items-center justify-between border-b border-slate-800 px-4.5">
          <SkeletonLine className="w-20" />
          <SkeletonLine className="w-28" />
        </div>
        <LogContent />
      </div>
    </div>
  );
}
