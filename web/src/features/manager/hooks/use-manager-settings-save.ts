import { useMutation, useQueryClient } from '@tanstack/react-query';

import { request } from '../../../shared/api/client';
import type { ManagerSettings } from '../types/manager';
import { MANAGER_SETTINGS_KEY } from './use-manager-settings-query';

export const MANAGER_SETTINGS_SAVE_KEY = ['manager-settings-save'];

export function useManagerSettingsSave() {
  const client = useQueryClient();
  return useMutation({
    mutationKey: MANAGER_SETTINGS_SAVE_KEY,
    mutationFn: (lan_access: boolean) =>
      request<ManagerSettings>('/api/manager/settings', { lan_access }),
    onSuccess: (settings) => client.setQueryData(MANAGER_SETTINGS_KEY, settings),
    // The save disappears with the dialog, so a reopened dialog starts without its result.
    gcTime: 0,
  });
}
