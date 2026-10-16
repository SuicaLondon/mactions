import { useRunnersLoading } from '../../../features/runners/data/hooks/use-runners-loading';
import { SkeletonLine } from '../../../shared/ui/loading/components/SkeletonLine';
import { useNavigationStore } from '../stores/navigation-store';
import { ActivityViewSwitch } from './ActivityViewSwitch';

/** The Runners/Runs switch, held by a skeleton until the runner list first loads. */
export function AppViewControl() {
  const view = useNavigationStore((state) => state.preferences.view);
  const changeView = useNavigationStore((state) => state.changeView);
  const loading = useRunnersLoading();
  if (loading) {
    return (
      <div className="flex h-8 w-35.5 items-center gap-5 rounded-lg bg-muted/10 px-3.5">
        <SkeletonLine className="w-14" />
        <SkeletonLine className="w-9" />
      </div>
    );
  }
  return <ActivityViewSwitch value={view} onChange={changeView} />;
}
