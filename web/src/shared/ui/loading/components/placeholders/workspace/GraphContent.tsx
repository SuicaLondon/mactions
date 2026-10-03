import { cn } from '../../../../../lib/cn';
import { SkeletonLine } from '../../SkeletonLine';

export function GraphContent() {
  return (
    <div className="min-w-0">
      <div className="flex min-h-14 items-center gap-2.5 px-5 py-3.75 max-md:p-3">
        <SkeletonLine className="h-3.5 w-16" />
        <SkeletonLine className="w-28" />
      </div>
      <div className="overflow-auto px-5 py-4 max-md:px-3">
        <div className="flex max-w-175 min-w-130 items-center">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="flex min-w-0 flex-1 items-center">
              <div
                className={cn(
                  'grid h-18 flex-1 content-center gap-3 rounded-md border border-line bg-canvas',
                  'p-3',
                )}
              >
                <SkeletonLine />
                <SkeletonLine className="w-20" />
              </div>
              {!!(index < 2) && <span className="h-0.25 w-9 shrink-0 bg-line" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
