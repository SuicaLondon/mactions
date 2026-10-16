import { cn } from '../../../../shared/lib/cn';
import { PendingLabel } from '../../../../shared/ui/controls/buttons/PendingLabel';
import { useConnection } from '../../hooks/use-connection';
import { useGitHubAuthorization } from '../../hooks/use-github-authorization';
import { connectionErrorMessages, isAuthorizationFailed } from '../../models/connection-errors';
import { DeviceCodeRow } from './DeviceCodeRow';

export function OrganizationAccessGrant() {
  const connection = useConnection();
  const { attempt, pending, start, starting, cancel, canceling, errors } = useGitHubAuthorization({
    organizationScope: true,
  });
  const messages = connectionErrorMessages({ connection: connection.error, ...errors });
  const failed = isAuthorizationFailed(attempt);
  let message =
    "To add organization runners, authorize GitHub CLI again with organization access. Your account stays the same; only the token's scopes change.";
  if (pending)
    message =
      'Enter this code on GitHub from any device, then approve organization access. Keep this window open.';
  if (failed) message = 'The authorization was not completed or the code expired. Start again.';
  if (messages.length) message = messages.map((error) => error.message).join(' ');
  let role: 'alert' | undefined;
  if (failed || messages.length) role = 'alert';
  let action = (
    <button type="button" className="button-primary text-xs" disabled={starting} onClick={start}>
      <PendingLabel pending={starting} idle="Grant organization access" busy="Starting…" />
    </button>
  );
  if (pending) {
    action = <DeviceCodeRow code={attempt?.code ?? null} canceling={canceling} onCancel={cancel} />;
  }
  return (
    // The message slot and the action slot keep one height across every state.
    <div className="flex flex-col items-start gap-2.5 rounded-lg bg-accent/6 p-3.5 text-xs">
      <p
        role={role}
        className={cn('m-0 min-h-15 leading-relaxed', { 'text-danger': role === 'alert' })}
      >
        {message}
      </p>
      {/* Phones wrap the device-code row onto two lines, so both states reserve that height. */}
      <div className="w-full max-md:min-h-20">{action}</div>
    </div>
  );
}
