import { SkeletonLine } from '../../../shared/ui/loading/components/SkeletonLine';
import { useRunnerWorkspace } from '../../runners/hooks/use-runner-workspace';
import { useNavigation } from '../hooks/use-navigation';
import { ActivityViewSwitch } from './ActivityViewSwitch';

export function AppViewControl() {
  const { preferences, changeView } = useNavigation();
  const { fleet } = useRunnerWorkspace();
  if (fleet.query.isPending) {
    return (
      <div className="flex h-8 w-35.5 items-center gap-5 rounded-lg bg-muted/10 px-3.5">
        <SkeletonLine className="w-14" />
        <SkeletonLine className="w-9" />
      </div>
    );
  }
  return <ActivityViewSwitch value={preferences.view} onChange={changeView} />;
}
