import { cn } from '../../../../../lib/cn';
import { SkeletonLine } from '../../SkeletonLine';

export function ToolbarContent({ view }: { view: 'runners' | 'runs' }) {
  const fields = [
    cn(
      'max-w-60 min-w-32.5 shrink grow basis-40 @max-xl/activity-main:col-span-2',
      '@max-xl/activity-main:max-w-none @max-xl/activity-main:basis-full',
    ),
    'min-w-35 max-w-62.5 shrink grow basis-40 @max-xl/activity-main:max-w-none',
    'min-w-35 max-w-75 shrink grow basis-45 @max-xl/activity-main:max-w-none',
    cn('w-41 min-w-36 flex-initial @max-xl/activity-main:w-auto', '@max-xl/activity-main:flex-1'),
  ];
  if (view === 'runners') {
    fields.push(
      cn('w-41 min-w-36 flex-initial @max-xl/activity-main:w-auto', '@max-xl/activity-main:flex-1'),
    );
  }
  return (
    <div
      className={cn(
        'flex min-h-13.5 flex-wrap items-center gap-2 border-b border-line bg-surface',
        'px-4 py-2.5 @max-xl/activity-main:grid @max-xl/activity-main:grid-cols-2',
      )}
    >
      {fields.map((field, index) => (
        <div
          // The placeholder slots are fixed and never reordered.
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
  );
}
