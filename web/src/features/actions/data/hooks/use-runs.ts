import { useInfiniteQuery } from '@tanstack/react-query';
import { secondsToMilliseconds } from 'date-fns';
import { useMemo } from 'react';

import { request } from '../../../../shared/api/client';
import { useQueryVisible } from '../../../../shared/hooks/use-query-visible';
import { activityPath, prepareRunList, refreshIntervalSeconds } from '../models/activity-data';
import type { ActivityRuns, Scope } from '../types/activity-types';

export function useRuns(scope: Scope, runnerId?: number, status = 'all', search = '') {
  const queryKey = [
    'activity-runs',
    scope.organization,
    scope.repository,
    runnerId ?? 'all',
    status,
  ];
  const visible = useQueryVisible(queryKey);
  let requestedStatus: string | undefined = status;
  if (status === 'all') requestedStatus = undefined;
  const query = useInfiniteQuery({
    queryKey,
    enabled: visible,
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      request<ActivityRuns>(
        activityPath('runs', {
          ...scope,
          page: pageParam,
          runner_id: runnerId,
          status: requestedStatus,
        }),
        undefined,
        signal,
      ),
    getNextPageParam: (page) => page.next_page ?? undefined,
    refetchInterval: (query) => {
      if (visible) return secondsToMilliseconds(refreshIntervalSeconds(query.state.data?.pages));
      return false;
    },
    refetchIntervalInBackground: false,
    staleTime: 20_000,
  });
  const list = useMemo(
    () => prepareRunList(query.data?.pages, status, search),
    [query.data, status, search],
  );
  return { query, ...list, refreshIntervalSeconds: refreshIntervalSeconds(query.data?.pages) };
}
