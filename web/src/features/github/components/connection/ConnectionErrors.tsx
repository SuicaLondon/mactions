import { cn } from '../../../../shared/lib/cn';
import type { GitHubAuthState } from '../../types/github-auth';

interface ConnectionErrorsProps {
  connection: GitHubAuthState['connection'];
  auth: GitHubAuthState['auth'];
  connect: GitHubAuthState['connect'];
  cancel: GitHubAuthState['cancel'];
}

export function ConnectionErrors({ connection, auth, connect, cancel }: ConnectionErrorsProps) {
  const error = connect.error ?? cancel.error ?? connection.error;
  return (
    <>
      {!!(auth.data?.status === 'failed' || auth.data?.status === 'expired') && (
        <p
          className={cn(
            'error-message m-0 mx-0 rounded-md border border-red-500/20 bg-red-500/4 px-3',
            'py-2.5 text-xs leading-relaxed wrap-anywhere whitespace-pre-wrap text-danger',
          )}
        >
          Authorization {auth.data.status}. Try again, or run mactions auth login in the host
          terminal.
        </p>
      )}
      {!!error && (
        <p
          className={cn(
            'error-message m-0 mx-0 rounded-md border border-red-500/20 bg-red-500/4 px-3',
            'py-2.5 text-xs leading-relaxed wrap-anywhere whitespace-pre-wrap text-danger',
          )}
        >
          {error.message}
        </p>
      )}
      {!!(!connection.data?.connected && connection.data?.message) && (
        <p className="detail-help mx-0 mt-2 mb-0 text-xs leading-relaxed text-muted">
          {connection.data.message}
        </p>
      )}
    </>
  );
}
