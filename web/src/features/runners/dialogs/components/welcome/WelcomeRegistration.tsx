import { cn } from '../../../../../shared/lib/cn';
import { type useConnection } from '../../../../github/hooks/connection/use-connection';
import { WelcomeContinueLabel } from './WelcomeContinueLabel';

export function WelcomeRegistration({
  method,
  connection,
  onClose,
}: {
  method: 'cli' | 'token';
  connection: ReturnType<typeof useConnection>;
  onClose: () => void;
}) {
  if (method === 'cli')
    return (
      <div className="welcome-method-details flex flex-col gap-3.5">
        <WelcomeContinueLabel connection={connection} onClose={onClose} />
      </div>
    );
  return (
    <div
      className={cn(
        'dialog-description welcome-method-details m-0 flex flex-col gap-3.5 text-xs',
        'leading-relaxed text-muted',
      )}
    >
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
