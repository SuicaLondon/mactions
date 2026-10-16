import { skipToken, useQuery } from '@tanstack/react-query';

import type { ManagerSettings } from '../types/manager';
import { MANAGER_SETTINGS_KEY } from './use-manager-settings-query';

/** Reads the settings that useManagerSettingsQuery loaded, without requesting them again. */
export function useCachedManagerSettings() {
  return useQuery<ManagerSettings>({ queryKey: MANAGER_SETTINGS_KEY, queryFn: skipToken }).data;
}
