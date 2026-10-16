import type { ManagerSettings } from '../types/manager';

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]', '::1'];

/** Whether this dashboard is open from another device rather than the Mac itself. */
export function isRemoteDashboard(hostname: string) {
  return !LOCAL_HOSTS.includes(hostname);
}

/**
 * Whether a save restarts the manager in a way this page can reconnect to. Turning LAN access
 * off from another device closes this connection instead.
 */
export function awaitsManagerRestart(saved: ManagerSettings | undefined, remote: boolean) {
  return !!saved?.restart_scheduled && (saved.lan_access || !remote);
}
