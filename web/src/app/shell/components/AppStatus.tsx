import { GitHubConnection } from '../../../features/github/components/connection/GitHubConnection';
import { cn } from '../../../shared/lib/cn';
import { useRunnerWorkspace } from '../../runners/hooks/use-runner-workspace';
import { useGitHubSetup } from '../../setup/hooks/use-github-setup';

export function AppStatus() {
  const { fleet, openCreate } = useRunnerWorkspace();
  const { welcome, disconnected } = useGitHubSetup();
  let notice = fleet.notice;
  if (fleet.query.error) notice = { message: fleet.query.error.message, error: true };

  return (
    <>
      {!!(!fleet.query.isPending && !welcome && disconnected) && (
        <GitHubConnection guide onUseToken={() => openCreate('token')} />
      )}
      {!!notice && (
        <div
          id="notice"
          className={cn(
            'max-h-32.5 overflow-auto border-b px-5.5 py-2.5 text-xs leading-normal',
            'wrap-anywhere whitespace-pre-wrap',
            {
              'error border-red-500/20 bg-red-500/4 text-danger': notice.error,
              'border-accent/20 bg-accent/5': !notice.error,
            },
          )}
          role="status"
          aria-live="polite"
        >
          {notice.message}
        </div>
      )}
    </>
  );
}
