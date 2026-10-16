import { Skeleton } from '../../../../../shared/ui/loading/components/Skeleton';
import { SkeletonLine } from '../../../../../shared/ui/loading/components/SkeletonLine';

/** Three capability rows. */
export function AccessSkeleton() {
  return (
    <Skeleton label="Checking GitHub access…">
      <div className="mb-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="grid gap-2 border-b border-line py-2.25">
            <SkeletonLine className="w-24" />
            <SkeletonLine className="w-20" />
          </div>
        ))}
      </div>
    </Skeleton>
  );
}
