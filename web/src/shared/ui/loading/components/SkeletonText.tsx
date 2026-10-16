import { SkeletonLine } from './SkeletonLine';

/** Two lines of text: a full line above a shorter secondary line. */
export function SkeletonText() {
  return (
    <div className="grid min-w-0 flex-1 gap-2">
      <SkeletonLine />
      <SkeletonLine className="w-20" />
    </div>
  );
}
