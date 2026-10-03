import { cn } from '../../../shared/lib/cn';
import { IconButton } from '../../../shared/ui/controls/buttons/IconButton';
import { CloseIcon } from '../../../shared/ui/icons/actions/CloseIcon';
import { useRunnerWorkspace } from '../hooks/use-runner-workspace';
import { RunnerDetailsContent } from './RunnerDetailsContent';

export function RunnerDetailsPanel() {
  const { inspector } = useRunnerWorkspace();
  if (!inspector.details) return null;

  return (
    <aside
      className={cn(
        'inspector runner-detail-panel flex w-77.5 min-w-0 shrink-0 grow-0 basis-80',
        'flex-col',
        'overflow-y-auto border-l border-l-line bg-inspector max-md:flex-none',
        'max-md:shrink-0 max-md:overflow-visible max-md:border-t max-md:border-l-0',
        'max-md:border-t-line max-sm:w-full max-sm:basis-full',
      )}
      aria-label="Runner details"
    >
      <header
        className={cn(
          'inspector-heading flex shrink-0 items-center justify-between border-b',
          'border-b-line',
          'sticky top-0 z-2 h-10 bg-inspector px-4.5 py-0',
        )}
      >
        <h2 className="m-0 text-xs font-semibold">Runner details</h2>
        <IconButton
          ref={inspector.closeDetailsButton}
          icon={CloseIcon}
          label="Close runner details"
          onClick={inspector.closeDetails}
        />
      </header>
      <RunnerDetailsContent />
    </aside>
  );
}
