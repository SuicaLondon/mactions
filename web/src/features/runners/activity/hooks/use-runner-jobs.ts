import { useQuery } from '@tanstack/react-query';

import { request } from '../../../../shared/api/client';
import type { Jobs } from '../../../../shared/api/types';
import { useQueryVisible } from '../../../../shared/hooks/use-query-visible';

export function useRunnerJobs(runnerId: number, repository: string, enabled: boolean) {
  const queryKey = ['jobs', runnerId, repository];
  const visible = useQueryVisible(queryKey, enabled);
  let refetchInterval: number | false = false;
  if (visible) refetchInterval = 30000;
  return useQuery({
    queryKey,
    queryFn: ({ signal }) =>
      request<Jobs>(
        `/api/runners/${runnerId}/jobs?repository=${encodeURIComponent(repository)}`,
        undefined,
        signal,
      ),
    enabled: visible,
    refetchInterval,
    staleTime: 20000,
    gcTime: 0,
  });
}
