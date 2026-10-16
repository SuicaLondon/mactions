import { useState } from 'react';

import { useRunnerInspectorStore } from '../../../features/runners/inspector/stores/runner-inspector-store';
import { cn } from '../../../shared/lib/cn';
import { AppNavigation } from '../../navigation/components/AppNavigation';
import { AppPageBar } from '../../navigation/components/AppPageBar';
import { useCurrentPage } from '../../navigation/hooks/use-current-page';
import { useDocumentTitle } from '../../navigation/hooks/use-document-title';
import { usePageRestoration } from '../../navigation/hooks/use-page-restoration';
import { AppPageContent } from '../../pages/components/AppPageContent';
import { RunnerDetailsPanel } from '../../runners/components/RunnerDetailsPanel';
import { useWelcomeDismissal } from '../../setup/hooks/use-welcome-dismissal';
import { useKeyboardShortcuts } from '../hooks/use-keyboard-shortcuts';
import { AppHeaderActions } from './AppHeaderActions';
import { ListFilters } from './filters/ListFilters';
import { KeyboardShortcutsDialog } from './KeyboardShortcutsDialog';
import { AppStatus } from './notices/AppStatus';

export function AppWorkspace() {
  const page = useCurrentPage();
  const content = usePageRestoration();
  const hasDetails = useRunnerInspectorStore((state) => Boolean(state.details));
  useDocumentTitle();
  useWelcomeDismissal();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const showShortcuts = () => setShortcutsOpen(true);
  useKeyboardShortcuts({ onShowShortcuts: showShortcuts });

  return (
    <main data-execution-shell className="flex h-dvh min-h-112.5 flex-col">
      <header
        className={cn(
          'flex min-h-12 shrink-0 items-center gap-4.5 border-b border-line',
          'bg-toolbar px-4 py-1.75 max-sm:gap-2 max-sm:py-1.5',
        )}
      >
        <AppNavigation />
        <AppHeaderActions onShowShortcuts={showShortcuts} />
      </header>
      <AppPageBar />
      <AppStatus />
      <div className="relative flex min-h-0 flex-1 overflow-hidden bg-surface">
        <div
          className={cn('@container/activity-main flex min-h-0 min-w-0 flex-1 flex-col', {
            'max-sm:hidden': hasDetails,
          })}
        >
          {(page.type === 'list' || page.type === 'runner') && <ListFilters />}
          <div
            ref={content}
            className={cn('flex min-h-0 flex-1 flex-col overflow-auto px-5 py-3.5', 'max-sm:p-3', {
              'overflow-hidden': page.type === 'diagnostics',
              'overflow-hidden p-0': page.type === 'run',
            })}
            key={page.key}
          >
            <AppPageContent />
          </div>
        </div>
        <RunnerDetailsPanel />
      </div>
      {shortcutsOpen && <KeyboardShortcutsDialog onClose={() => setShortcutsOpen(false)} />}
    </main>
  );
}
