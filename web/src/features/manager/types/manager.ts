export type InstallSource = 'script' | 'homebrew' | 'manual';

export interface ManagerSettings {
  lan_access: boolean;
  version: string;
  source: InstallSource;
  managed: boolean;
  process_id: number;
  restart_scheduled?: boolean;
}

export interface ManagerUpdate {
  current_version: string;
  latest_version: string;
  available: boolean;
  source: InstallSource;
  can_update: boolean;
  message: string;
  release_url?: string;
}

export interface ManagerUpdateStatus {
  state: 'idle' | 'running' | 'complete' | 'failed';
  message: string;
  log?: string;
  from_version?: string;
  to_version?: string | null;
}
