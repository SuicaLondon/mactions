import { useQuery } from '@tanstack/react-query';

import { request } from '../../../shared/api/client';
import type { ManagerSettings } from '../types/manager';
import { MANAGER_SETTINGS_KEY } from './use-manager-settings-query';

/**
 * Follows the background refreshes of the settings useManagerSettingsQuery loads, which keep the
 * loaded settings on screen when they fail. It never requests the settings on mount; retry does.
 */
export function useManagerSettingsRefresh() {
  const query = useQuery({
    queryKey: MANAGER_SETTINGS_KEY,
    queryFn: ({ signal }) => request<ManagerSettings>('/api/manager/settings', undefined, signal),
    enabled: false,
  });
  return { error: query.error, fetching: query.isFetching, retry: () => void query.refetch() };
}
