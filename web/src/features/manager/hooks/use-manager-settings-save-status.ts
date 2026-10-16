import { useMutationState } from '@tanstack/react-query';

import { awaitsManagerRestart, isRemoteDashboard } from '../models/manager-network';
import type { ManagerSettings } from '../types/manager';
import { MANAGER_SETTINGS_SAVE_KEY } from './use-manager-settings-save';

/** Reads the latest network settings save from any part of the settings dialog. */
export function useManagerSettingsSaveStatus() {
  const states = useMutationState({
    filters: { mutationKey: MANAGER_SETTINGS_SAVE_KEY },
    select: (mutation) => ({
      status: mutation.state.status,
      error: mutation.state.error,
      // Only useManagerSettingsSave runs mutations under this key, and it resolves to settings.
      saved: mutation.state.data as ManagerSettings | undefined,
      submittedAt: mutation.state.submittedAt,
    }),
  });
  const latest = states.at(-1);
  const saved = latest?.saved;
  return {
    pending: latest?.status === 'pending',
    error: latest?.error ?? null,
    saved,
    submittedAt: latest?.submittedAt ?? 0,
    restarting: awaitsManagerRestart(saved, isRemoteDashboard(window.location.hostname)),
  };
}
