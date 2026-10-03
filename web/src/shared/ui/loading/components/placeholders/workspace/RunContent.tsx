import { cn } from '../../../../../lib/cn';
import { SkeletonLine } from '../../SkeletonLine';
import { GraphContent } from './GraphContent';

export function RunContent() {
  return (
    <div
      className={cn(
        'grid min-h-0 flex-1 grid-cols-[--spacing(75)_minmax(0,_1fr)]',
        'max-lg:grid-cols-[--spacing(67.5)_minmax(0,_1fr)]',
        'max-sm:grid-cols-[--spacing(45)_minmax(0,_1fr)]',
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
      <GraphContent />
    </div>
  );
}
