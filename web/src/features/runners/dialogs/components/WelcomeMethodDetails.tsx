import { cn } from '../../../../shared/lib/cn';
import { GitHubConnection } from '../../../github/components/connection/GitHubConnection';

/** What the chosen setup method involves: connecting GitHub CLI, or registering with a token. */
export function WelcomeMethodDetails({
  method,
  onContinueLocal,
}: {
  method: 'cli' | 'token';
  /** Leaves setup to keep using the local runner controls without GitHub. */
  onContinueLocal: () => void;
}) {
  if (method === 'cli')
    return (
      <div className="flex flex-col gap-3.5">
        <p className="m-0 text-xs/relaxed text-muted">
          Already ran gh auth login on this Mac? mactions can reuse that login for the same OS user.
          If you are connected over SSH or Tailscale, this means the Mac running mactions.
        </p>
        <GitHubConnection variant="card" guide onContinueLocal={onContinueLocal} />
      </div>
    );
  return (
    <div className={cn('m-0 flex flex-col gap-3.5 text-xs', 'leading-relaxed text-muted')}>
      <p className="m-0">
        Use a registration token from your repository or organization's GitHub Settings → Actions →
        Runners → New self-hosted runner. You will choose a target and enter the token next.
        mactions does not save the token.
      </p>
      <p className="m-0">
        <strong>Some features are limited without a GitHub connection.</strong> You can register a
        runner, start, stop, restart, and view local logs. GitHub runner status, workflow and job
        status, label editing, and GitHub deregistration require a GitHub connection with the
        appropriate permissions.
      </p>
      <p className="m-0">
        You can connect GitHub CLI later. Choosing a registration token does not disconnect an
        existing GitHub account.
      </p>
    </div>
  );
}
