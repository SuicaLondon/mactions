import { useQuery } from '@tanstack/react-query';
import { secondsToMilliseconds } from 'date-fns';

import { request } from '../../../../shared/api/client';
import { useQueryVisible } from '../../../../shared/hooks/use-query-visible';
import { activityPath, refreshIntervalSeconds } from '../models/activity-data';
import type { RunnerWork, Scope } from '../types/activity-types';

export function useRunnerWork(scope: Scope, enabled = true) {
  const queryKey = ['activity-work', scope.organization, scope.repository];
  const visible = useQueryVisible(queryKey, enabled);
  const query = useQuery({
    queryKey,
    enabled: visible,
    queryFn: ({ signal }) =>
      request<RunnerWork>(activityPath('work', { ...scope }), undefined, signal),
    refetchInterval: (query) => {
      if (visible) return secondsToMilliseconds(refreshIntervalSeconds([query.state.data]));
      return false;
    },
    refetchIntervalInBackground: false,
    staleTime: 20_000,
  });
  return { query, refreshIntervalSeconds: refreshIntervalSeconds([query.data]) };
}
