import { Skeleton } from '../../../loading/components/Skeleton';
import { SkeletonLine } from '../../../loading/components/SkeletonLine';

const optionWidthClasses = ['w-35', 'w-28', 'w-32'];

/** Option rows while the menu's first choices load. */
export function SelectLoadingMessage() {
  return (
    <Skeleton label="Loading options…" className="px-2.5">
      {optionWidthClasses.map((width) => (
        <div key={width} className="flex min-h-8 items-center">
          <SkeletonLine className={width} />
        </div>
      ))}
    </Skeleton>
  );
}
