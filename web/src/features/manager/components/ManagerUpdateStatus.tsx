import { cn } from '../../../shared/lib/cn';
import type { useManagerUpdate } from '../hooks/use-manager-update';

export function ManagerUpdateStatus({ update }: { update: ReturnType<typeof useManagerUpdate> }) {
  const { status, start, health, running } = update;
  const result = status.data;
  if (running && status.errorUpdateCount >= 40)
    return (
      <p role="alert" className="mb-0 text-xs text-danger">
        The manager has not reconnected. Run mactions open on the Mac to check update progress.
      </p>
    );
  if (running && status.isError)
    return (
      <p role="status" className="mb-0 text-xs text-muted">
        The manager is restarting. Reconnecting to check update progress…
      </p>
    );
  if (start.isError && result?.state === 'idle')
    return (
      <p role="alert" className="mb-0 text-xs text-danger">
        {start.error.message}
      </p>
    );
  if (status.isError && !running)
    return (
      <p role="alert" className="mb-0 text-xs text-danger">
        Could not read update status: {status.error.message}
      </p>
    );
  if (!result || result.state === 'idle') return null;
  let role = 'status';
  if (result.state === 'failed') role = 'alert';
  return (
    <div aria-live="polite" className="mt-3">
      <p
        role={role}
        className={cn('my-2 text-xs', {
          'text-danger': result.state === 'failed',
          'text-muted': result.state !== 'failed',
        })}
      >
        {result.message}
      </p>
      {result.log && (
        <details className="text-xs">
          <summary>Update log</summary>
          <pre
            className={cn(
              'my-2 max-h-48 overflow-auto rounded-md border border-line bg-surface p-3',
              'font-mono text-xs wrap-anywhere whitespace-pre-wrap',
            )}
          >
            {result.log}
          </pre>
        </details>
      )}
      {result.state === 'complete' && health.errorUpdateCount >= 30 && (
        <p role="alert" className="mb-0 text-xs text-danger">
          The manager has not reconnected. Run mactions open on the Mac to check its status.
        </p>
      )}
    </div>
  );
}
