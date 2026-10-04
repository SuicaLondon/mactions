import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { request } from '../../../shared/api/client';
import { useQueryVisible } from '../../../shared/hooks/use-query-visible';
import type { ManagerUpdate, ManagerUpdateStatus } from '../types/manager';

const UPDATE_KEY = ['manager-update'];
const STATUS_KEY = ['manager-update-status'];

export function useManagerUpdate(onReload: () => void) {
  const client = useQueryClient();
  const watching = useRef(false);
  const reloaded = useRef(false);
  const attempt = useRef<{ from_version: string; to_version: string } | null>(null);
  const unconfirmed = useRef(false);
  const visible = useQueryVisible(STATUS_KEY);
  const check = useQuery({
    queryKey: UPDATE_KEY,
    queryFn: ({ signal }) => request<ManagerUpdate>('/api/manager/update', undefined, signal),
    enabled: visible,
    refetchOnMount: 'always',
  });
  const start = useMutation({
    mutationFn: () => request<ManagerUpdateStatus>('/api/manager/update', {}),
    onMutate: async () => {
      watching.current = true;
      reloaded.current = false;
      unconfirmed.current = false;
      if (check.data)
        attempt.current = {
          from_version: check.data.current_version,
          to_version: check.data.latest_version,
        };
      await client.cancelQueries({ queryKey: STATUS_KEY });
      client.setQueryData<ManagerUpdateStatus>(STATUS_KEY, {
        state: 'running',
        message: 'Starting update…',
      });
    },
    onSuccess: (result) => client.setQueryData(STATUS_KEY, result),
    onError: (error) => {
      if (error instanceof TypeError) {
        // The helper may have restarted the manager after accepting the request.
        unconfirmed.current = true;
        void client.invalidateQueries({ queryKey: STATUS_KEY });
        return;
      }
      client.setQueryData<ManagerUpdateStatus>(STATUS_KEY, {
        state: 'failed',
        message: error.message,
      });
    },
  });
  const status = useQuery({
    queryKey: STATUS_KEY,
    queryFn: async ({ signal }) => {
      const result = await request<ManagerUpdateStatus>(
        '/api/manager/update-status',
        undefined,
        signal,
      );
      const expected = attempt.current;
      const historicalCompletion =
        result.state === 'complete' &&
        expected &&
        (result.from_version !== expected.from_version ||
          result.to_version !== expected.to_version);
      if (historicalCompletion && start.isPending) {
        const waiting: ManagerUpdateStatus = { state: 'running', message: 'Starting update…' };
        return waiting;
      }
      if (historicalCompletion || (unconfirmed.current && result.state === 'idle')) {
        const failed: ManagerUpdateStatus = {
          state: 'failed',
          message: 'The update request could not be confirmed. Check for updates and try again.',
        };
        return failed;
      }
      return result;
    },
    enabled: visible,
    refetchOnMount: 'always',
    retry: false,
    refetchInterval: (query) => {
      if (
        visible &&
        query.state.errorUpdateCount < 40 &&
        (start.isPending || query.state.data?.state === 'running')
      )
        return 1500;
      return false;
    },
  });
  const health = useQuery({
    queryKey: ['manager-health', 'update', start.submittedAt, status.data?.to_version],
    queryFn: async ({ signal }) => {
      const result = await request<{ version: string }>('/api/manager/health', undefined, signal);
      if (!status.data?.to_version || result.version !== status.data.to_version)
        throw new Error('Waiting for the updated manager to restart.');
      return result;
    },
    enabled: visible && watching.current && status.data?.state === 'complete',
    retry: false,
    refetchInterval: (query) => {
      if (
        visible &&
        watching.current &&
        query.state.data?.version !== status.data?.to_version &&
        query.state.errorUpdateCount < 30
      )
        return 1000;
      return false;
    },
  });
  useEffect(() => {
    if (status.data?.state === 'running') watching.current = true;
    if (
      !watching.current ||
      status.data?.state !== 'complete' ||
      !health.data ||
      health.data.version !== status.data.to_version ||
      reloaded.current
    )
      return;
    reloaded.current = true;
    onReload();
  }, [status.data?.state, status.data?.to_version, health.data, onReload]);
  const running = start.isPending || status.data?.state === 'running';
  return { check, start, status, health, running };
}
