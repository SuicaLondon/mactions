import { useRef } from 'react';

import { useLocalRunners } from '../../../features/runners/data/hooks/use-local-runners';
import { useRunnersLoading } from '../../../features/runners/data/hooks/use-runners-loading';
import { useRunnerInspectorSync } from '../../../features/runners/inspector/hooks/use-runner-inspector-sync';
import { useRunnerInspectorStore } from '../../../features/runners/inspector/stores/runner-inspector-store';
import { cn } from '../../../shared/lib/cn';
import { IconButton } from '../../../shared/ui/controls/buttons/IconButton';
import { CloseIcon } from '../../../shared/ui/icons/CloseIcon';
import { useCurrentPage } from '../../navigation/hooks/use-current-page';
import { useNavigationStore } from '../../navigation/stores/navigation-store';
import { useWelcome } from '../../setup/hooks/use-welcome';
import { useDetailsOverlayTop } from '../hooks/use-details-overlay-top';
import { useRunnerWorkspaceStore } from '../stores/runner-workspace-store';
import { RunnerDetailsContent } from './RunnerDetailsContent';

export function RunnerDetailsPanel() {
  const details = useRunnerInspectorStore((state) => state.details);
  const closeDetails = useRunnerInspectorStore((state) => state.closeDetails);
  const overlayOpen = useRunnerWorkspaceStore(
    (state) => state.modal !== null || state.menu !== null,
  );
  const welcome = useWelcome();
  const rows = useLocalRunners();
  const loaded = !useRunnersLoading();
  const closeButton = useRef<HTMLButtonElement>(null);
  useRunnerInspectorSync({ rows, loaded, blocked: overlayOpen || welcome, closeButton });
  const panel = useRef<HTMLElement>(null);
  const pageKey = useCurrentPage().key;
  const view = useNavigationStore((state) => state.preferences.view);
  useDetailsOverlayTop(panel, Boolean(details), `${pageKey}:${view}:${loaded}`);
  if (!details) return null;

  return (
    // From xl (1280px) the panel sits beside the list, which keeps every column readable. Narrower
    // screens overlay the list instead, since squeezing it there would truncate most columns.
    // On the Runners page it starts below the list header to keep Add runner and Refresh usable.
    <aside
      ref={panel}
      data-inspector
      className={cn(
        'absolute inset-y-0 right-0 z-10 flex w-80',
        'max-w-full min-w-0 flex-col overflow-y-auto border-l border-l-line bg-inspector',
        'shadow-lg max-xl:data-anchored:border-t max-xl:data-anchored:border-t-line',
        'max-sm:w-full max-sm:border-l-0',
        'xl:static xl:shrink-0 xl:grow-0 xl:basis-80 xl:shadow-none',
      )}
      aria-label="Runner details"
    >
      <header
        className={cn(
          'flex shrink-0 items-center justify-between border-b',
          'border-b-line',
          'sticky top-0 z-2 h-10 bg-inspector px-4.5 py-0',
        )}
      >
        <h2 className="m-0 text-xs font-semibold">Runner details</h2>
        <IconButton
          ref={closeButton}
          icon={CloseIcon}
          label="Close runner details"
          onClick={closeDetails}
        />
      </header>
      <RunnerDetailsContent />
    </aside>
  );
}
