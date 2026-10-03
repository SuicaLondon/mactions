import { useQuery } from '@tanstack/react-query';

import { request } from '../../../../shared/api/client';
import type { LogSnapshot } from '../../../../shared/api/types';
import { useQueryVisible } from '../../../../shared/hooks/use-query-visible';

export function useRunnerLogs(runnerId: number, file: string, live: boolean, enabled: boolean) {
  const queryKey = ['logs', runnerId, file];
  const visible = useQueryVisible(queryKey, enabled);
  let refetchInterval: number | false = false;
  if (visible && live) refetchInterval = 2000;
  return useQuery({
    queryKey,
    queryFn: ({ signal }) => {
      let path = `/api/runners/${runnerId}/logs`;
      if (file) path += `?file=${encodeURIComponent(file)}`;
      return request<LogSnapshot>(path, undefined, signal);
    },
    enabled: visible,
    refetchInterval,
    gcTime: 0,
  });
}
