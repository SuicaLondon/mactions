import { cn } from '../../../../../lib/cn';
import { SkeletonLine } from '../../SkeletonLine';

export function Copy({ secondary = true }: { secondary?: boolean }) {
  return (
    <div className="grid min-w-0 flex-1 gap-2">
      <SkeletonLine />
      <span
        className={cn({
          block: secondary,
          hidden: !secondary,
        })}
      >
        <SkeletonLine className="w-20" />
      </span>
    </div>
  );
}
