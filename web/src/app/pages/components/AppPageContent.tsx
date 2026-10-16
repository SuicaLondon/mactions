import { useRunnersLoading } from '../../../features/runners/data/hooks/use-runners-loading';
import { useCurrentPage } from '../../navigation/hooks/use-current-page';
import { useNavigationStore } from '../../navigation/stores/navigation-store';
import { ActionsPage } from './ActionsPage';
import { AppStartupPlaceholder } from './AppStartupPlaceholder';
import { DiagnosticsPage } from './DiagnosticsPage';
import { RunnersPage } from './RunnersPage';

export function AppPageContent() {
  const page = useCurrentPage();
  const view = useNavigationStore((state) => state.preferences.view);
  const loading = useRunnersLoading();
  if (loading) return <AppStartupPlaceholder view={view} />;
  if (page.type === 'list' && view === 'runners') return <RunnersPage />;
  if (page.type === 'diagnostics') return <DiagnosticsPage />;
  return <ActionsPage />;
}
