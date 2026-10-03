import { useQuery } from '@tanstack/react-query';

import { request } from '../../../../shared/api/client';
import type { JobLogs } from '../../../../shared/api/types';
import { useQueryVisible } from '../../../../shared/hooks/use-query-visible';
import type { ReplayLogs } from '../types/replay-logs';

interface JobLogsOptions {
  jobId: number;
  repository: string;
  runnerId?: number;
  stepNumber?: number;
  replay?: ReplayLogs;
}

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
  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => request<JobLogs>(`${path}?${params}`, undefined, signal),
    enabled: visible,
    refetchInterval: (query) => {
      if (visible && query.state.data?.state === 'pending') return 15_000;
      return false;
    },
    staleTime: 30_000,
    gcTime: 0,
  });

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
