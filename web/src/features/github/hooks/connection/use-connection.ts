import { useQuery } from '@tanstack/react-query';

import { request } from '../../../../shared/api/client';
import type { Connection } from '../../../../shared/api/types';
import { usePageVisible } from '../../../../shared/hooks/use-page-visible';

export const CONNECTION_KEY = ['github-connection'];
export function useConnection() {
  const visible = usePageVisible();
  let refetchInterval: number | false = false;
  if (visible) refetchInterval = 60_000;
  return useQuery({
    queryKey: CONNECTION_KEY,
    queryFn: ({ signal }) => request<Connection>('/api/github/connection', undefined, signal),
    enabled: visible,
    staleTime: 30_000,
    refetchInterval,
  });
}
