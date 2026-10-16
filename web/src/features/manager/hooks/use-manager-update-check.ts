import { useQuery } from '@tanstack/react-query';

import { request } from '../../../shared/api/client';
import { usePageVisible } from '../../../shared/hooks/use-page-visible';
import type { ManagerUpdate } from '../types/manager';

export const MANAGER_UPDATE_KEY = ['manager-update'];

/** Checks GitHub for a newer manager release while the page is visible. */
export function useManagerUpdateCheck() {
  const visible = usePageVisible();
  return useQuery({
    queryKey: MANAGER_UPDATE_KEY,
    queryFn: ({ signal }) => request<ManagerUpdate>('/api/manager/update', undefined, signal),
    enabled: visible,
    refetchOnMount: 'always',
  });
}
