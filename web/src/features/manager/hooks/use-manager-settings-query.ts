import { useQuery } from '@tanstack/react-query';

import { request } from '../../../shared/api/client';
import { useQueryVisible } from '../../../shared/hooks/use-query-visible';
import type { ManagerSettings } from '../types/manager';

export const MANAGER_SETTINGS_KEY = ['manager-settings'];

/** Loads the manager settings while the dialog is open and the page is visible. */
export function useManagerSettingsQuery() {
  const visible = useQueryVisible(MANAGER_SETTINGS_KEY);
  return useQuery({
    queryKey: MANAGER_SETTINGS_KEY,
    queryFn: ({ signal }) => request<ManagerSettings>('/api/manager/settings', undefined, signal),
    enabled: visible,
    refetchOnMount: 'always',
  });
}
