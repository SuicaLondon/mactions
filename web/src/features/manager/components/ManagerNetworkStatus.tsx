import { useManagerSettingsRefresh } from '../hooks/use-manager-settings-refresh';
import { useManagerSettingsSaveStatus } from '../hooks/use-manager-settings-save-status';
import { isRemoteDashboard } from '../models/manager-network';
import type { ManagerSettings } from '../types/manager';

interface ManagerNetworkStatusProps {
  data: ManagerSettings;
  restartStalled: boolean;
}

/**
 * Describes the latest save or refresh inside two lines the network form always reserves; long
 * failures are clamped there and keep their full text in a tooltip.
 */
export function ManagerNetworkStatus({ data, restartStalled }: ManagerNetworkStatusProps) {
  const { error: saveError, saved, restarting } = useManagerSettingsSaveStatus();
  const refresh = useManagerSettingsRefresh();
  const remote = isRemoteDashboard(window.location.hostname);
  if (saveError) {
    const detail = saveError.message.trim().replace(/\.+$/u, '');
    const message = `Could not save network settings: ${detail}. Try saving again.`;
    return (
      <span role="alert" className="text-danger" title={message}>
        {message}
      </span>
    );
  }
  if (restartStalled) {
    const message =
      'The manager has not finished restarting. Run mactions open on the Mac to check its status.';
    return (
      <span role="alert" className="text-danger" title={message}>
        {message}
      </span>
    );
  }
  // A saved remote shutdown or a restart is expected to interrupt refreshes, so say that first.
  if (saved && remote && !data.lan_access && saved.restart_scheduled)
    return 'Settings saved. Open mactions on the Mac to reconnect.';
  if (saved && restarting) return 'Restarting the manager and reconnecting…';
  // A failed refetch keeps the cached settings on screen; say they may be out of date.
  if (refresh.error) {
    const detail = refresh.error.message.trim().replace(/\.+$/u, '');
    return (
      <span role="alert" className="text-danger">
        Could not refresh settings: {detail}. These may be out of date.{' '}
        <button
          type="button"
          className="min-h-0 border-0 bg-transparent p-0 text-xs/4 text-accent shadow-none"
          disabled={refresh.fetching}
          onClick={refresh.retry}
        >
          Retry
        </button>
      </span>
    );
  }
  if (!saved) return null;
  if (!data.managed) return 'Settings saved. Restart the manager manually to apply them.';
  if (!saved.restart_scheduled) return 'Settings saved. No additional restart is needed.';
  return null;
}
