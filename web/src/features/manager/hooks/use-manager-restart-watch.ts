import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { request } from '../../../shared/api/client';
import { usePageVisible } from '../../../shared/hooks/use-page-visible';
import { useManagerSettingsSaveStatus } from './use-manager-settings-save-status';

/**
 * Waits for a new manager process after a network settings save restarts it, then reloads.
 * Returns whether the restart has taken too long to finish.
 */
export function useManagerRestartWatch(onReload: () => void) {
  const { restarting, saved, submittedAt } = useManagerSettingsSaveStatus();
  const [checkHealth, setCheckHealth] = useState(false);
  const reloaded = useRef(false);
  const visible = usePageVisible();
  const health = useQuery({
    queryKey: ['manager-health', 'settings', submittedAt],
    queryFn: async ({ signal }) => {
      const result = await request<{ version: string; process_id: number }>(
        '/api/manager/health',
        undefined,
        signal,
      );
      if (result.process_id === saved?.process_id)
        throw new Error('Waiting for the manager to restart.');
      return result;
    },
    enabled: visible && checkHealth,
    retry: false,
    refetchInterval: (result) => {
      if (visible && checkHealth && !result.state.data && result.state.errorUpdateCount < 30)
        return 1000;
      return false;
    },
  });
  useEffect(() => {
    if (!restarting) return;
    // Give the current manager time to return its response and restart.
    const timer = window.setTimeout(() => setCheckHealth(true), 1500);
    return () => window.clearTimeout(timer);
  }, [restarting]);
  useEffect(() => {
    if (!checkHealth || !health.data || reloaded.current) return;
    reloaded.current = true;
    onReload();
  }, [checkHealth, health.data, onReload]);
  return restarting && health.errorUpdateCount >= 30;
}
