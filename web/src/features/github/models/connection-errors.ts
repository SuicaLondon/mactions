import type { LoginAttempt } from '../../../shared/api/types';

/** Request failures from the device authorization flow. */
export interface AuthorizationErrors {
  auth: Error | null;
  connect: Error | null;
  cancel: Error | null;
}

export interface ConnectionErrorSources extends AuthorizationErrors {
  connection: Error | null;
}

export interface ConnectionErrorMessage {
  key: string;
  message: string;
}

function withoutFinalPeriod(message: string) {
  return message.trim().replace(/\.+$/u, '');
}

/** Describes every failed GitHub request once, with the next step to take. */
export function connectionErrorMessages({
  connection,
  auth,
  connect,
  cancel,
}: ConnectionErrorSources): ConnectionErrorMessage[] {
  const candidates = [
    {
      key: 'connect',
      error: connect,
      what: 'Could not start GitHub authorization',
      next: 'Try again, or run mactions auth login in the host terminal.',
    },
    {
      key: 'cancel',
      error: cancel,
      what: 'Could not cancel GitHub authorization',
      next: 'Try again, or let the code expire.',
    },
    {
      key: 'auth',
      error: auth,
      what: 'Could not read GitHub authorization progress',
      next: 'Reload the dashboard, or run mactions auth login in the host terminal.',
    },
    {
      key: 'connection',
      error: connection,
      what: 'Could not check the GitHub connection',
      next: 'Use Check again to retry.',
    },
  ];
  const seen = new Set<string>();
  const messages: ConnectionErrorMessage[] = [];
  for (const { key, error, what, next } of candidates) {
    if (!error) continue;
    const detail = withoutFinalPeriod(error.message);
    if (seen.has(detail)) continue;
    seen.add(detail);
    let message = `${what}. ${next}`;
    if (detail) message = `${what}: ${detail}. ${next}`;
    messages.push({ key, message });
  }
  return messages;
}

/** The last device authorization ended without granting access. */
export function isAuthorizationFailed(attempt: LoginAttempt | undefined) {
  return attempt?.status === 'failed' || attempt?.status === 'expired';
}
