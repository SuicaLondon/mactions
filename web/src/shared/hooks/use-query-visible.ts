import { hashKey, type QueryKey, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { usePageVisible } from './use-page-visible';

export function useQueryVisible(queryKey: QueryKey, enabled = true) {
  const visible = usePageVisible();
  const client = useQueryClient();
  const key = hashKey(queryKey);
  useEffect(() => {
    if (!visible || !enabled)
      void client.cancelQueries({ predicate: (query) => query.queryHash === key });
  }, [visible, enabled, client, key]);
  return visible && enabled;
}
