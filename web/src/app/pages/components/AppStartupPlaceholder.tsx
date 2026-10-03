import { cn } from '../../../shared/lib/cn';
import { LoadingPlaceholder } from '../../../shared/ui/loading/components/LoadingPlaceholder';
import { SkeletonLine } from '../../../shared/ui/loading/components/SkeletonLine';
import type { AppPreferences } from '../../navigation/hooks/use-app-preferences';

export function AppStartupPlaceholder({ view }: { view: AppPreferences['view'] }) {
  return (
    <div className="app-startup-placeholder">
      <header className="mb-2.5 flex min-h-7.5 items-center justify-between gap-3">
        <div className={cn({ 'grid min-h-18 gap-2 py-1': view === 'runs' })}>
          {!!(view === 'runs') && <SkeletonLine className="w-24" />}
          <SkeletonLine className="h-4 w-28" />
          {!!(view === 'runs') && <SkeletonLine className="w-24" />}
        </div>
        <SkeletonLine className="size-6" />
      </header>
      <LoadingPlaceholder kind={view} />
    </div>
  );
}
