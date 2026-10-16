import { cn } from '../../../../shared/lib/cn';
import { Skeleton } from '../../../../shared/ui/loading/components/Skeleton';
import { SkeletonLine } from '../../../../shared/ui/loading/components/SkeletonLine';

const searchFieldClasses = cn(
  'max-w-60 min-w-32.5 shrink grow basis-32 @max-xl/activity-main:col-span-2',
  '@max-xl/activity-main:max-w-none @max-xl/activity-main:basis-full',
);
const organizationFieldClasses = cn(
  'max-w-62.5 min-w-35 shrink grow basis-40 @max-xl/activity-main:max-w-none',
);
const repositoryFieldClasses = cn(
  'max-w-75 min-w-35 shrink grow basis-45 @max-xl/activity-main:max-w-none',
);
const selectFieldClasses = cn(
  'w-41 min-w-36 flex-initial @max-xl/activity-main:w-auto',
  '@max-xl/activity-main:flex-1',
);

/** Holds the toolbar's height and the page's fields while the runner list first loads. */
export function ListFiltersSkeleton({
  runsList,
  showScope,
}: {
  runsList: boolean;
  showScope: boolean;
}) {
  const fieldClasses = [searchFieldClasses];
  if (showScope) fieldClasses.push(organizationFieldClasses, repositoryFieldClasses);
  fieldClasses.push(selectFieldClasses);
  if (!runsList) fieldClasses.push(selectFieldClasses);
  return (
    <Skeleton label="Loading filters…">
      <div
        className={cn(
          'flex min-h-13.5 flex-wrap items-center gap-2 border-b border-line bg-surface',
          'px-4 py-2.5 @max-xl/activity-main:grid @max-xl/activity-main:grid-cols-2',
        )}
      >
        {fieldClasses.map((field, index) => (
          <div
            // A page's fields are fixed and never reordered.
            // eslint-disable-next-line react-x/no-array-index-key
            key={index}
            className={cn(
              'flex h-8 items-center rounded-md border border-control-border bg-canvas px-2',
              field,
            )}
          >
            <SkeletonLine className="w-28" />
          </div>
        ))}
      </div>
    </Skeleton>
  );
}
