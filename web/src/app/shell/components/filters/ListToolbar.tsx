import { LoadingPlaceholder } from '../../../../shared/ui/loading/components/LoadingPlaceholder';
import { useNavigation } from '../../../navigation/hooks/use-navigation';
import { useRunnerWorkspace } from '../../../runners/hooks/use-runner-workspace';
import { ListFilters } from './ListFilters';

export function ListToolbar() {
  const { preferences } = useNavigation();
  const { fleet } = useRunnerWorkspace();
  if (fleet.query.isPending) {
    return <LoadingPlaceholder kind="toolbar" view={preferences.view} />;
  }
  return <ListFilters />;
}
