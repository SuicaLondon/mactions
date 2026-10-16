import { hashKey, type QueryClient, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { request } from '../../../../shared/api/client';
import type { JobLogs } from '../../../../shared/api/types';
import { useQueryVisible } from '../../../../shared/hooks/use-query-visible';
import type { JobLogSource } from '../types/job-log-source';

interface JobLogsOptions extends JobLogSource {
  jobId: number;
  stepNumber?: number;
}

/**
 * Logs each query client's viewers left most recently, kept for a quick return. A step view can
 * hold two logs at once (the step and the full-job fallback), so a few are kept, not one.
 */
const recentlyLeftLogs = new WeakMap<QueryClient, string[]>();
const KEPT_LEFT_LOGS = 3;

const missingReplayLogs: JobLogs = {
  state: 'pending',
  content: '',
  steps: [],
  message: 'No recorded output is available at this point.',
};

export function useJobLogs({ jobId, repository, runnerId, stepNumber, replay }: JobLogsOptions) {
  const queryKey = ['job-logs', runnerId ?? 'activity', repository, jobId, stepNumber ?? 'all'];
  const visible = useQueryVisible(queryKey, !replay);
  const params = new URLSearchParams({ repository, job_id: String(jobId) });
  if (stepNumber !== undefined) params.set('step_number', String(stepNumber));
  let path = '/api/activity/job-logs';
  if (runnerId !== undefined) path = `/api/runners/${runnerId}/job-logs`;
  const client = useQueryClient();
  const queryHash = hashKey(queryKey);
  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => request<JobLogs>(`${path}?${params}`, undefined, signal),
    enabled: visible,
    refetchInterval: (query) => {
      if (visible && query.state.data?.state === 'pending') return 15_000;
      return false;
    },
    staleTime: 30_000,
    // Logs can reach 16 MiB and mactions targets 8 GB Macs, so the cache stays small: a log
    // left within the last minute is shown again while it refreshes, and the effect below
    // keeps only the few most recently left logs besides those on screen.
    gcTime: 60_000,
  });
  useEffect(() => {
    // Runs after useQuery subscribes; observed logs, including this one, are never removed.
    const cache = client.getQueryCache();
    const kept = recentlyLeftLogs.get(client) ?? [];
    for (const entry of cache.findAll({ queryKey: ['job-logs'] })) {
      if (entry.getObserversCount()) continue;
      if (entry.queryHash === queryHash || kept.includes(entry.queryHash)) continue;
      cache.remove(entry);
    }
    return () => {
      const recent = (recentlyLeftLogs.get(client) ?? []).filter((hash) => hash !== queryHash);
      recentlyLeftLogs.set(client, [queryHash, ...recent].slice(0, KEPT_LEFT_LOGS));
    };
  }, [client, queryHash]);

  let data = query.data;
  let error = query.error;
  if (replay) {
    data = replay.logs[String(stepNumber ?? 'all')] ?? missingReplayLogs;
    error = null;
  }
  return {
    data,
    isPending: !replay && query.isPending,
    isFetching: !replay && query.isFetching,
    error,
    refetch: query.refetch,
  };
}
