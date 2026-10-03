import { useInfiniteQuery } from '@tanstack/react-query';
import { secondsToMilliseconds } from 'date-fns';
import { useMemo } from 'react';

import { request } from '../../../../shared/api/client';
import { useQueryVisible } from '../../../../shared/hooks/use-query-visible';
import { activityPath, mergeRunnerPages, refreshIntervalSeconds } from '../models/activity-data';
import type { ActivityRunners, Scope } from '../types/activity-types';

export function useRunnerInventory(scope: Scope, enabled = true) {
  const queryKey = ['activity-runners', scope.organization, scope.repository];
  const visible = useQueryVisible(queryKey, enabled);
  const query = useInfiniteQuery({
    queryKey,
    enabled: visible,
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      request<ActivityRunners>(
        activityPath('runners', { ...scope, page: pageParam }),
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
  const inventory = useMemo(() => mergeRunnerPages(query.data?.pages), [query.data]);
  return {
    query,
    ...inventory,
    refreshIntervalSeconds: refreshIntervalSeconds(query.data?.pages),
  };
}
