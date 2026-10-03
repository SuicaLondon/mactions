import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { request } from '../../../../shared/api/client';
import type { Targets } from '../../../../shared/api/types';
import { mergeTargets } from '../../../github/models/target-options';
import { type RunnerScopeKind } from '../models/runner-creation';

export function useRunnerTargets(
  kind: RunnerScopeKind,
  login: string | null | undefined,
  enabled: boolean,
) {
  const discovery = useInfiniteQuery({
    queryKey: ['targets', kind, login],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      request<Targets>(`/api/github/targets?kind=${kind}&page=${pageParam}`, undefined, signal),
    enabled,
    getNextPageParam: (page) => page.next_page ?? undefined,
    staleTime: 60000,
  });
  const options = useMemo(
    () => mergeTargets(discovery.data?.pages.flatMap((page) => page.items) ?? []),
    [discovery.data],
  );
  return { discovery, options };
}
