import { useState } from 'react';

import { cn } from '../../../shared/lib/cn';
import { PendingLabel } from '../../../shared/ui/controls/buttons/PendingLabel';
import { ClampedMessage } from '../../../shared/ui/feedback/components/ClampedMessage';
import { useManagerSettingsSave } from '../hooks/use-manager-settings-save';
import { awaitsManagerRestart, isRemoteDashboard } from '../models/manager-network';
import type { ManagerSettings } from '../types/manager';
import { ManagerNetworkStatus } from './ManagerNetworkStatus';

interface ManagerNetworkSettingsProps {
  data: ManagerSettings;
  disabled: boolean;
  restartStalled: boolean;
}

export function ManagerNetworkSettings({
  data,
  disabled,
  restartStalled,
}: ManagerNetworkSettingsProps) {
  const [draft, setDraft] = useState<boolean | null>(null);
  const lanAccess = draft ?? data.lan_access;
  const save = useManagerSettingsSave();
  const remote = isRemoteDashboard(window.location.hostname);
  const restarting = awaitsManagerRestart(save.data, remote);
  const disconnects = remote && data.lan_access && !lanAccess;
  let restartMessage = 'Saving restarts the manager dashboard. Runners continue running.';
  if (!data.managed)
    restartMessage =
      'After saving, restart the manager: stop mactions serve with Ctrl-C and run it again. Runners continue running.';
  // Shares the restart line, so toggling the checkbox never inserts a paragraph.
  if (disconnects)
    restartMessage =
      'Saving closes this connection. Open mactions on the Mac to reach the dashboard again.';
  let busyLabel = 'Saving…';
  if (restarting) busyLabel = 'Restarting…';
  return (
    <section className="mt-4" aria-labelledby="manager-network-title">
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
        <div
          className={cn(
            'my-3 rounded-md border border-warning/30 bg-warning/8 px-3 py-2.5 text-xs',
            'leading-relaxed text-foreground',
          )}
        >
          <strong className="font-semibold">There is no dashboard login.</strong> By default, only
          this Mac can open the dashboard. With this on, anyone on your network can control runners
          and start GitHub authorization with this Mac's account.
        </div>
        <p
          role="status"
          className={cn('my-2 min-h-9 text-xs/relaxed', {
            'text-foreground': disconnects,
            'text-muted': !disconnects,
          })}
        >
          {restartMessage}
        </p>
        <button
          type="submit"
          disabled={disabled || save.isPending || restarting || lanAccess === data.lan_access}
        >
          <PendingLabel
            pending={save.isPending || restarting}
            idle="Save network settings"
            busy={busyLabel}
          />
        </button>
        {/* Reserves two lines, so a wrapped failure never moves the update section below; longer
            text gets a Details link. */}
        <ClampedMessage live className="mt-2" textClassName="text-muted">
          <ManagerNetworkStatus data={data} restartStalled={restartStalled} />
        </ClampedMessage>
      </form>
    </section>
  );
}
