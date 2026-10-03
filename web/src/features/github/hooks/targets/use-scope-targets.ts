import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { request } from '../../../../shared/api/client';
import type { TargetOption, Targets } from '../../../../shared/api/types';
import { useQueryVisible } from '../../../../shared/hooks/use-query-visible';
import { activityPath } from '../../../actions/data/models/activity-data';
import type { Scope } from '../../../actions/data/types/activity-types';
import { mergeTargets } from '../../models/target-options';
export function useScopeTargets(
  kind: 'org' | 'repo',
  scope: Scope,
  local: TargetOption[],
  connected: boolean,
) {
  const [open, setOpen] = useState(false);
  let organization = '';
  if (kind === 'repo') organization = scope.organization;
  const queryKey = ['activity-targets', kind, organization];
  const visible = useQueryVisible(queryKey, open && connected);
  const query = useInfiniteQuery({
    queryKey,
    enabled: visible,
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) => {
      let path = `/api/github/targets?kind=${kind}&page=${pageParam}`;
      if (kind === 'repo' && scope.organization) {
        path = activityPath('repositories', {
          organization: scope.organization,
          page: pageParam,
        });
      }
      return request<Targets>(path, undefined, signal);
    },
    getNextPageParam: (page) => page.next_page ?? undefined,
    staleTime: 60000,
  });
  const options = useMemo(
    () => mergeTargets([...local, ...(query.data?.pages.flatMap((page) => page.items) ?? [])]),
    [local, query.data],
  );
  return { query, options, setOpen };
}
