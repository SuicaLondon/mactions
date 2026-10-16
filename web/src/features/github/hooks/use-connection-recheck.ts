import { useQueryClient } from '@tanstack/react-query';

import { RUNNERS_KEY } from '../../runners/data/models/runner-snapshot-query';
import { CONNECTION_KEY } from './use-connection';

/** Refreshes the GitHub connection and everything that depends on it. */
export function useConnectionRecheck() {
  const client = useQueryClient();
  return () => {
    void client.invalidateQueries({ queryKey: CONNECTION_KEY });
    void client.invalidateQueries({ queryKey: ['capabilities'] });
    void client.invalidateQueries({ queryKey: RUNNERS_KEY });
  };
}
