import { cn } from '../../../../../shared/lib/cn';
import { GitHubConnection } from '../../../../github/components/connection/GitHubConnection';
import type { useConnection } from '../../../../github/hooks/connection/use-connection';

export function WelcomeContinueLabel({
  connection,
  onClose,
}: {
  connection: ReturnType<typeof useConnection>;
  onClose: () => void;
}) {
  if (connection.data?.connected)
    return (
      <>
        <section
          className={cn(
            'connected-account flex flex-col gap-2.5 rounded-lg border border-line bg-surface',
            'p-5',
          )}
          aria-label="Connected GitHub account"
        >
          <div className="connected-account-status flex items-center gap-2 text-xs text-muted">
            <span className="connection-dot connected size-1.75 rounded-full bg-green-500" />
            GitHub CLI connected
          </div>
          <strong className="connected-account-name text-xl font-semibold wrap-anywhere">
            @{connection.data.login}
          </strong>
          <p className="m-0 text-xs leading-relaxed text-muted">
            Using the existing gh login on the Mac running mactions. No additional login is needed.
          </p>
        </section>
        <p className="dialog-description m-0 text-xs leading-relaxed text-muted">
          Use this account to register runners and view GitHub status and jobs. Available actions
          depend on its repository and organization permissions.
        </p>
      </>
    );
  return (
    <>
      <p className="dialog-description m-0 text-xs leading-relaxed text-muted">
        Already ran gh auth login on this Mac? mactions can reuse that login for the same OS user.
        If you are connected over SSH or Tailscale, this means the Mac running mactions.
      </p>
      <GitHubConnection guide welcome onContinueLocal={onClose} />
    </>
  );
}
