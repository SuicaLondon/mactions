import { PendingLabel } from '../../../../shared/ui/controls/buttons/PendingLabel';
import { useConnection } from '../../hooks/use-connection';
import { useConnectionRecheck } from '../../hooks/use-connection-recheck';

/** Checks the GitHub CLI login again, such as after logging in from the terminal. */
export function ConnectionRecheckButton() {
  const checking = useConnection().isFetching;
  const recheck = useConnectionRecheck();
  return (
    <button
      type="button"
      className="min-h-5.5 border-0 bg-transparent p-0 text-xs text-accent shadow-none"
      disabled={checking}
      onClick={recheck}
    >
      <PendingLabel pending={checking} idle="Check again" busy="Checking…" />
    </button>
  );
}
