import { useState } from 'react';

import type { useManagerSettings } from '../hooks/use-manager-settings';
import type { ManagerSettings } from '../types/manager';

export function ManagerNetworkSettings({
  settings,
  data,
  disabled,
}: {
  settings: ReturnType<typeof useManagerSettings>;
  data: ManagerSettings;
  disabled: boolean;
}) {
  const [draft, setDraft] = useState<boolean | null>(null);
  const lanAccess = draft ?? data.lan_access;
  const { save, restarting, health, remote } = settings;
  const disconnects = remote && data.lan_access && !lanAccess;
  let restartMessage = 'Saving restarts the manager dashboard. Runners continue running.';
  if (!data.managed)
    restartMessage = 'Restart the manager manually after saving. Runners continue running.';
  return (
    <section className="mt-5" aria-labelledby="manager-network-title">
      <h3 id="manager-network-title" className="m-0 text-xs font-semibold">
        Network access
      </h3>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (disabled || save.isPending || restarting || lanAccess === data.lan_access) return;
          save.mutate(lanAccess);
        }}
      >
        <label className="mt-3 flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={lanAccess}
            disabled={disabled || save.isPending || restarting}
            onChange={(event) => setDraft(event.target.checked)}
            className="min-h-auto"
          />
          Allow access from other devices
        </label>
        <p className="my-2 text-xs leading-relaxed text-muted">
          By default, only this Mac can open the dashboard. Other devices on your network receive
          full management access, including runner control and GitHub authorization.
        </p>
        <p className="my-2 text-xs leading-relaxed text-muted">{restartMessage}</p>
        {disconnects && (
          <p role="status" className="my-2 text-xs text-foreground">
            This connection will close. Open mactions on the Mac to access the dashboard again.
          </p>
        )}
        <button
          type="submit"
          disabled={disabled || save.isPending || restarting || lanAccess === data.lan_access}
        >
          Save network settings
        </button>
        {save.isError && (
          <p role="alert" className="mb-0 text-xs text-danger">
            {save.error.message}
          </p>
        )}
        {save.isSuccess && !data.managed && (
          <p role="status" className="mb-0 text-xs text-muted">
            Settings saved. Restart the manager manually to apply them.
          </p>
        )}
        {save.isSuccess && remote && !data.lan_access && save.data.restart_scheduled && (
          <p role="status" className="mb-0 text-xs text-muted">
            Settings saved. Open mactions on the Mac to reconnect.
          </p>
        )}
        {save.isSuccess && data.managed && !save.data.restart_scheduled && (
          <p role="status" className="mb-0 text-xs text-muted">
            Settings saved. No additional restart is needed.
          </p>
        )}
        {restarting && health.errorUpdateCount < 30 && (
          <p role="status" className="mb-0 text-xs text-muted">
            Restarting the manager and reconnecting…
          </p>
        )}
        {restarting && health.errorUpdateCount >= 30 && (
          <p role="alert" className="mb-0 text-xs text-danger">
            The manager has not finished restarting. Run mactions open on the Mac to check its
            status.
          </p>
        )}
      </form>
    </section>
  );
}
