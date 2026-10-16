import type { LoginAttempt } from '../../../../shared/api/types';
import { ClampedMessage } from '../../../../shared/ui/feedback/components/ClampedMessage';
import { useConnection } from '../../hooks/use-connection';
import {
  type AuthorizationErrors,
  connectionErrorMessages,
  isAuthorizationFailed,
} from '../../models/connection-errors';

interface ConnectionErrorsProps {
  attempt: LoginAttempt | undefined;
  authorizationErrors: AuthorizationErrors;
}

function attemptMessage(attempt: LoginAttempt | undefined) {
  if (!attempt || !isAuthorizationFailed(attempt)) return null;
  let reason = 'GitHub authorization did not finish.';
  if (attempt.status === 'expired') reason = 'The device code expired before it was entered.';
  return `${reason} Start again, or run mactions auth login in the host terminal.`;
}

export function ConnectionErrors({ attempt, authorizationErrors }: ConnectionErrorsProps) {
  const connection = useConnection();
  const messages = connectionErrorMessages({
    connection: connection.error,
    ...authorizationErrors,
  }).map(({ message }) => message);
  const failed = attemptMessage(attempt);
  if (failed) messages.unshift(failed);
  return (
    <>
      {/* Two reserved lines, so a failed or recovered authorization never resizes the banner.
          Longer messages clamp, with a Details link to the full text. */}
      <ClampedMessage className="w-full" textClassName="text-danger">
        {messages.map((message) => (
          <span key={message} role="alert">
            {message}{' '}
          </span>
        ))}
      </ClampedMessage>
      {!!(!connection.data?.connected && connection.data?.message) && (
        <p className="mx-0 mt-2 mb-0 text-xs/relaxed text-muted">{connection.data.message}</p>
      )}
    </>
  );
}
