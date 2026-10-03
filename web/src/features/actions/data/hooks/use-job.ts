import { useQuery } from '@tanstack/react-query';

import { request } from '../../../../shared/api/client';
import type { Job } from '../../../../shared/api/types';
import { useQueryVisible } from '../../../../shared/hooks/use-query-visible';
import { isActive } from '../../shared/models/activity-status';
import { activityPath } from '../models/activity-data';

export function useJob(repository: string, jobId: number) {
  const queryKey = ['activity-job', repository, jobId];
  const visible = useQueryVisible(queryKey);
  return useQuery({
    queryKey,
    enabled: visible,
    queryFn: ({ signal }) =>
      request<Job>(activityPath('job', { repository, job_id: jobId }), undefined, signal),
    refetchInterval: (query) => {
      if (visible && isActive(query.state.data?.status ?? 'pending')) return 15_000;
      return false;
    },
    refetchIntervalInBackground: false,
    staleTime: 10_000,
  });
}
