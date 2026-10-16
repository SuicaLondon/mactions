import { GitHubStatus } from '../../../features/github/components/GitHubStatus';
import { ManagerSettingsAction } from '../../../features/manager/components/ManagerSettingsAction';
import { useRunnersLoading } from '../../../features/runners/data/hooks/use-runners-loading';
import { IconButton } from '../../../shared/ui/controls/buttons/IconButton';
import { FolderIcon } from '../../../shared/ui/icons/FolderIcon';
import { KeyboardIcon } from '../../../shared/ui/icons/KeyboardIcon';
import { SkeletonLine } from '../../../shared/ui/loading/components/SkeletonLine';
import { useRunnerWorkspaceStore } from '../../runners/stores/runner-workspace-store';
import { useWelcomeStore } from '../../setup/stores/welcome-store';

/** Until the runner list first loads, skeletons hold the header buttons' space. */
export function AppHeaderActions({ onShowShortcuts }: { onShowShortcuts: () => void }) {
  const starting = useRunnersLoading();
  const openSetup = useWelcomeStore((state) => state.openSetup);
  const openStorage = useRunnerWorkspaceStore((state) => state.openStorage);
  let settings = <ManagerSettingsAction />;
  let dataDirectory = (
    <IconButton icon={FolderIcon} label="Data directory…" onClick={openStorage} />
  );
  if (starting) {
    settings = <SkeletonLine className="h-7.25 w-17 rounded-md max-md:h-10 pointer-coarse:h-10" />;
    dataDirectory = <SkeletonLine className="size-7.25 max-md:size-10 pointer-coarse:size-10" />;
  }
  return (
    <div className="ml-auto flex w-auto shrink-0 items-center gap-2 max-sm:gap-1">
      <GitHubStatus interactive={!starting} onOpen={openSetup} />
      {/* Always rendered so the header keeps its width during startup. Touch-only devices have
      no keyboard to use the shortcuts with, so the button is hidden there. */}
      <IconButton
        icon={KeyboardIcon}
        label="Keyboard shortcuts"
        title="Keyboard shortcuts (?)"
        className="pointer-coarse:hidden"
        onClick={onShowShortcuts}
      />
      {settings}
      {dataDirectory}
    </div>
  );
}
