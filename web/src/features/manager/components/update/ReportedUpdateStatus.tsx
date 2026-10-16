import { cn } from '../../../../shared/lib/cn';
import type { ManagerUpdateStatus } from '../../types/manager';

interface ReportedUpdateStatusProps {
  status: ManagerUpdateStatus;
  /** The update finished but the restarted manager has not answered. */
  reconnectStalled: boolean;
}

/** Shows the state the manager reported for the update, with its log when there is one. */
export function ReportedUpdateStatus({ status, reconnectStalled }: ReportedUpdateStatusProps) {
  let role = 'status';
  if (status.state === 'failed') role = 'alert';
  return (
    <div aria-live="polite" className="mt-3">
      <p
        role={role}
        className={cn('my-2 text-xs', {
          'text-danger': status.state === 'failed',
          'text-muted': status.state !== 'failed',
        })}
      >
        {status.message}
      </p>
      {status.log && (
        <details className="text-xs">
          <summary>Update log</summary>
          <pre
            className={cn(
              'my-2 max-h-48 overflow-auto rounded-md border border-line bg-surface p-3',
              'font-mono text-xs wrap-anywhere whitespace-pre-wrap',
            )}
          >
            {status.log}
          </pre>
        </details>
      )}
      {reconnectStalled && (
        <p role="alert" className="mb-0 text-xs text-danger">
          The manager has not reconnected. Run mactions open on the Mac to check its status.
        </p>
      )}
    </div>
  );
}
