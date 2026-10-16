import type { ManagerUpdateProgress } from '../../models/manager-update-progress';
import { ReportedUpdateStatus } from './ReportedUpdateStatus';

/** The update progress line below the settings dialog's actions. */
export function ManagerUpdateReport({ progress }: { progress: ManagerUpdateProgress }) {
  switch (progress.kind) {
    case 'none':
      return null;
    case 'unreachable':
      return (
        <p role="alert" className="mt-3 mb-0 text-xs text-danger">
          The manager has not reconnected. Run mactions open on the Mac to check update progress.
        </p>
      );
    case 'reconnecting':
      return (
        <p role="status" className="mt-3 mb-0 text-xs text-muted">
          The manager is restarting. Reconnecting to check update progress…
        </p>
      );
    case 'start-failed':
      return (
        <p role="alert" className="mt-3 mb-0 text-xs text-danger">
          {progress.message}
        </p>
      );
    case 'status-failed':
      return (
        <p role="alert" className="mt-3 mb-0 text-xs text-danger">
          Could not read update status: {progress.message}
        </p>
      );
    case 'reported':
      return (
        <ReportedUpdateStatus
          status={progress.status}
          reconnectStalled={progress.reconnectStalled}
        />
      );
  }
}
