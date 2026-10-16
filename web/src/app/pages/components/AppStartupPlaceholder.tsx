import { ActivityTableSkeleton } from '../../../features/actions/shared/components/table/ActivityTableSkeleton';
import { RunnerGridSkeleton } from '../../../features/runners/list/components/RunnerGridSkeleton';
import { cn } from '../../../shared/lib/cn';
import { SkeletonLine } from '../../../shared/ui/loading/components/SkeletonLine';
import { type AppPreferences } from '../../navigation/models/app-preferences';

/** Holds the page header and list shape of the saved view until the runner list first loads. */
export function AppStartupPlaceholder({ view }: { view: AppPreferences['view'] }) {
  return (
    <div>
      <header className="mb-2.5 flex min-h-7.5 items-center justify-between gap-3">
        <div className={cn({ 'grid min-h-18 gap-2 py-1': view === 'runs' })}>
          {!!(view === 'runs') && <SkeletonLine className="w-24" />}
          <SkeletonLine className="h-4 w-28" />
          {!!(view === 'runs') && <SkeletonLine className="w-24" />}
        </div>
        <SkeletonLine className="size-6" />
      </header>
      {view === 'runners' && <RunnerGridSkeleton />}
      {view === 'runs' && <ActivityTableSkeleton kind="runs" />}
    </div>
  );
}
