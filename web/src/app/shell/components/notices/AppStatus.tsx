import { GitHubConnection } from '../../../../features/github/components/connection/GitHubConnection';
import { useConnection } from '../../../../features/github/hooks/use-connection';
import { useRunnersError } from '../../../../features/runners/data/hooks/use-runners-error';
import { useRunnersLoading } from '../../../../features/runners/data/hooks/use-runners-loading';
import { useRunnersRefresh } from '../../../../features/runners/data/hooks/use-runners-refresh';
import { useRunnerOperationStore } from '../../../../features/runners/data/stores/runner-operation-store';
import { cn } from '../../../../shared/lib/cn';
import { useRunnerWorkspaceStore } from '../../../runners/stores/runner-workspace-store';
import { useWelcome } from '../../../setup/hooks/use-welcome';
import { OperationToast } from './OperationToast';
import { RunnerQueryAlert } from './RunnerQueryAlert';

export function AppStatus() {
  const loading = useRunnersLoading();
  const error = useRunnersError();
  const refresh = useRunnersRefresh();
  const notice = useRunnerOperationStore((state) => state.notice);
  const dismissNotice = useRunnerOperationStore((state) => state.dismissNotice);
  const openCreate = useRunnerWorkspaceStore((state) => state.openCreate);
  const welcome = useWelcome();
  const connection = useConnection();
  // Read the last known connection rather than the query status so a failed
  // background refetch does not hide and reshow the guide.
  const data = connection.data;
  const guide = Boolean(data && !data.connected && data.state !== 'unavailable');

  return (
    <>
      {!!(!loading && !welcome && guide) && (
        <GitHubConnection variant="banner" guide onUseToken={() => openCreate('token')} />
      )}
      <div
        id="notice"
        className={cn(
          'pointer-events-none fixed right-4 bottom-4 z-50 flex w-80 flex-col gap-2',
          'max-sm:inset-x-3 max-sm:bottom-3 max-sm:w-auto',
        )}
      >
        {!!error && <RunnerQueryAlert message={error} onRetry={refresh} />}
        <OperationToast notice={notice} onDismiss={dismissNotice} />
      </div>
    </>
  );
}
