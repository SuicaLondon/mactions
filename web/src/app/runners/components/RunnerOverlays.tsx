import { WelcomeDialog } from '../../../features/runners/dialogs/components/welcome/WelcomeDialog';
import { RunnerMenu } from '../../../features/runners/menu/components/RunnerMenu';
import { useGitHubSetup } from '../../setup/hooks/use-github-setup';
import { useRunnerWorkspace } from '../hooks/use-runner-workspace';
import { RunnerModal } from './RunnerModal';

export function RunnerOverlays() {
  const { fleet, menu, closeMenu, onAction, openCreate } = useRunnerWorkspace();
  const { connected, welcome, dismissWelcome } = useGitHubSetup();

  return (
    <>
      {!!menu && (
        <RunnerMenu
          runner={menu.runner}
          x={menu.x}
          y={menu.y}
          locked={fleet.locked}
          connected={connected}
          onAction={onAction}
          onClose={closeMenu}
        />
      )}
      {!!(!fleet.query.isPending && welcome) && (
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
