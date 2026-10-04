import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { request } from '../../../shared/api/client';
import { useQueryVisible } from '../../../shared/hooks/use-query-visible';
import type { ManagerSettings } from '../types/manager';

const SETTINGS_KEY = ['manager-settings'];

export function useManagerSettings(onReload: () => void) {
  const client = useQueryClient();
  const [restarting, setRestarting] = useState(false);
  const [checkHealth, setCheckHealth] = useState(false);
  const reloaded = useRef(false);
  const visible = useQueryVisible(SETTINGS_KEY);
  const query = useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: ({ signal }) => request<ManagerSettings>('/api/manager/settings', undefined, signal),
    enabled: visible,
    refetchOnMount: 'always',
  });
  const remote = !['localhost', '127.0.0.1', '[::1]', '::1'].includes(window.location.hostname);
  const save = useMutation({
    mutationFn: (lan_access: boolean) =>
      request<ManagerSettings>('/api/manager/settings', { lan_access }),
    onSuccess: (settings) => {
      client.setQueryData(SETTINGS_KEY, settings);
      if (settings.restart_scheduled && (settings.lan_access || !remote)) setRestarting(true);
    },
  });
  const health = useQuery({
    queryKey: ['manager-health', 'settings', save.submittedAt],
    queryFn: async ({ signal }) => {
      const result = await request<{ version: string; process_id: number }>(
        '/api/manager/health',
        undefined,
        signal,
      );
      if (result.process_id === save.data?.process_id)
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
  return { query, save, restarting, health, remote };
}
