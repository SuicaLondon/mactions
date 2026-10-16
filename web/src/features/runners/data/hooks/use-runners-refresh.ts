import { useQueryClient } from '@tanstack/react-query';

import { RUNNERS_KEY } from '../models/runner-snapshot-query';

/** Reads the runner snapshot now. A hidden page has paused its polling, so nothing is sent. */
export function useRunnersRefresh() {
  const client = useQueryClient();
  return () => {
    void client.refetchQueries({ queryKey: RUNNERS_KEY, type: 'active' }, { cancelRefetch: false });
  };
}
