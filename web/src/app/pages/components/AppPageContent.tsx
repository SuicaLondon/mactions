import { useNavigation } from '../../navigation/hooks/use-navigation';
import { useRunnerWorkspace } from '../../runners/hooks/use-runner-workspace';
import { ActionsPage } from './ActionsPage';
import { AppStartupPlaceholder } from './AppStartupPlaceholder';
import { DiagnosticsPage } from './DiagnosticsPage';
import { RunnersPage } from './RunnersPage';

export function AppPageContent() {
  const { page, preferences } = useNavigation();
  const { fleet } = useRunnerWorkspace();
  if (fleet.query.isPending) return <AppStartupPlaceholder view={preferences.view} />;
  if (page.type === 'list' && preferences.view === 'runners') return <RunnersPage />;
  if (page.type === 'diagnostics') return <DiagnosticsPage />;
  return <ActionsPage />;
}
