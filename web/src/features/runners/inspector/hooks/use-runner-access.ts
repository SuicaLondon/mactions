import { useQuery } from '@tanstack/react-query';

import { request } from '../../../../shared/api/client';
import type { Capabilities } from '../../../../shared/api/types';
import { usePageVisible } from '../../../../shared/hooks/use-page-visible';

export function useRunnerAccess(runnerId: number, enabled: boolean) {
  const visible = usePageVisible();
  const access = useQuery({
    queryKey: ['capabilities', runnerId],
    queryFn: ({ signal }) =>
      request<Capabilities>(`/api/runners/${runnerId}/capabilities`, undefined, signal),
    enabled: enabled && visible,
    staleTime: 30000,
  });
  return access;
}
