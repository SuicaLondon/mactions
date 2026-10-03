import { useQuery } from '@tanstack/react-query';

import { request } from '../../../../shared/api/client';
import { useQueryVisible } from '../../../../shared/hooks/use-query-visible';
import { isActive } from '../../shared/models/activity-status';
import { activityPath } from '../models/activity-data';
import type { RunActivity } from '../types/activity-types';

export function useRun(run: { id: number; repository: string; attempt?: number }) {
  const queryKey = ['activity-run', run.repository, run.id, run.attempt ?? 'latest'];
  const visible = useQueryVisible(queryKey);
  return useQuery({
    queryKey,
    enabled: visible,
    queryFn: ({ signal }) =>
      request<RunActivity>(
        activityPath('run', { repository: run.repository, run_id: run.id, attempt: run.attempt }),
        undefined,
        signal,
      ),
    refetchInterval: (query) => {
      if (visible && isActive(query.state.data?.run.status ?? 'pending')) return 15_000;
      return false;
    },
    refetchIntervalInBackground: false,
    staleTime: 10_000,
  });
}
