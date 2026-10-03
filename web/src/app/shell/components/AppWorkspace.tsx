import { cn } from '../../../shared/lib/cn';
import { useNavigation } from '../../navigation/hooks/use-navigation';
import { AppPageContent } from '../../pages/components/AppPageContent';
import { RunnerDetailsPanel } from '../../runners/components/RunnerDetailsPanel';
import { useRunnerWorkspace } from '../../runners/hooks/use-runner-workspace';
import { AppStatus } from './AppStatus';
import { ListToolbar } from './filters/ListToolbar';
import { AppChrome } from './header/AppChrome';

export function AppWorkspace() {
  const { page, list, content } = useNavigation();
  const { inspector } = useRunnerWorkspace();

  return (
    <main
      className={cn('app execution-shell flex h-dvh min-h-112.5 flex-col', {
        'viewing-run': page.type === 'run',
        'viewing-diagnostics': page.type === 'diagnostics',
        'has-runner-details': Boolean(inspector.details),
      })}
    >
      <AppChrome />
      <AppStatus />
      <div className="activity-workspace relative flex min-h-0 flex-1 overflow-hidden bg-surface">
        <div
          className={cn(
            'activity-main @container/activity-main flex min-h-0 min-w-0 flex-1 flex-col',
            { 'max-sm:hidden': Boolean(inspector.details) },
          )}
        >
          {list && <ListToolbar />}
          <div
            ref={content}
            className={cn(
              'activity-page-content flex min-h-0 flex-1 flex-col overflow-auto px-5 py-3.5',
              'max-sm:p-3',
              {
                'overflow-hidden': page.type === 'diagnostics',
                'overflow-hidden p-0': page.type === 'run',
              },
            )}
            key={page.key}
          >
            <AppPageContent />
          </div>
        </div>
        <RunnerDetailsPanel />
      </div>
    </main>
  );
}
