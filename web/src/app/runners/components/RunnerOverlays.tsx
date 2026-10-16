import { useRunnerOperationLocked } from '../../../features/runners/data/hooks/use-runner-operation-locked';
import { useRunnersLoading } from '../../../features/runners/data/hooks/use-runners-loading';
import { WelcomeDialog } from '../../../features/runners/dialogs/components/WelcomeDialog';
import { RunnerMenu } from '../../../features/runners/menu/components/RunnerMenu';
import { useGitHubConnected } from '../../setup/hooks/use-github-connected';
import { useWelcome } from '../../setup/hooks/use-welcome';
import { useWelcomeStore } from '../../setup/stores/welcome-store';
import { useRunnerAction } from '../hooks/use-runner-action';
import { useRunnerMenu } from '../hooks/use-runner-menu';
import { useRunnerWorkspaceStore } from '../stores/runner-workspace-store';
import { RunnerModal } from './RunnerModal';

export function RunnerOverlays() {
  const locked = useRunnerOperationLocked();
  const loading = useRunnersLoading();
  const menu = useRunnerMenu();
  const closeMenu = useRunnerWorkspaceStore((state) => state.closeMenu);
  const openCreate = useRunnerWorkspaceStore((state) => state.openCreate);
  const onAction = useRunnerAction();
  const connected = useGitHubConnected();
  const welcome = useWelcome();
  const dismissWelcome = useWelcomeStore((state) => state.dismissWelcome);

  return (
    <>
      {!!menu && (
        <RunnerMenu
          runner={menu.runner}
          x={menu.x}
          y={menu.y}
          locked={locked}
          connected={connected}
          onAction={onAction}
          onClose={closeMenu}
        />
      )}
      {!!(!loading && welcome) && (
        <WelcomeDialog
          onClose={dismissWelcome}
          onUseToken={() => {
            dismissWelcome();
            openCreate('token');
          }}
        />
      )}
      <RunnerModal />
    </>
  );
}
