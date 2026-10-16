import { formatTime } from '../../../../shared/lib/date';

interface ManagerCheckResultProps {
  fetching: boolean;
  error: Error | null;
  /** True when the last successful check found no newer release. */
  upToDate: boolean;
  /** A note about the release or install source, shown when there is no error. */
  note: string | null;
  checkedAt: number;
}

/** States the outcome of the last update check in a line the panel always reserves. */
export function ManagerCheckResult({
  fetching,
  error,
  upToDate,
  note,
  checkedAt,
}: ManagerCheckResultProps) {
  if (fetching) return null;
  if (error) {
    const detail = error.message.trim().replace(/\.+$/u, '');
    const message = `Could not check for updates: ${detail}. Use Check for updates to try again.`;
    // The reserved status line clamps long errors to two lines; the title keeps the full text.
    return (
      <span role="alert" className="text-danger" title={message}>
        {message}
      </span>
    );
  }
  if (note) return note;
  if (!upToDate) return null;
  return `Up to date as of ${formatTime(checkedAt)}`;
}
