import { useQuery, useQueryClient } from '@tanstack/react-query';
import { isBefore } from 'date-fns';
import type { RefObject } from 'react';

import { getRunners } from '../../../../shared/api/client';
import type { Snapshot } from '../../../../shared/api/types';
import { useQueryVisible } from '../../../../shared/hooks/use-query-visible';
import { currentDate } from '../../../../shared/lib/date';

export const RUNNERS_KEY = ['runners'] as const;

export interface RunnerSnapshotOptions {
  remote: boolean;
  pending: boolean;
  mutating: RefObject<boolean>;
  syncUntil: RefObject<Date>;
}

export function useRunnerSnapshot({ remote, pending, mutating, syncUntil }: RunnerSnapshotOptions) {
  const client = useQueryClient();
  const visible = useQueryVisible(RUNNERS_KEY);
  const query = useQuery({
    queryKey: RUNNERS_KEY,
    enabled: visible,
    queryFn: async ({ signal }) => {
      if (client.getQueryData<{ connected: boolean }>(['github-connection'])?.connected === false)
        return getRunners(true, signal);
      const local =
        !remote ||
        mutating.current ||
        Boolean(client.getQueryData<Snapshot>(RUNNERS_KEY)?.operation_running);
      const data = await getRunners(local, signal);
      // Recover remote state once another CLI/browser's operation has finished.
      if (remote && local && !data.operation_running && !mutating.current)
        return getRunners(false, signal);
      return data;
    },
    refetchInterval: (query) => {
      if (!visible) return false;
      if (pending || query.state.data?.operation_running) return 1_500;
      if (isBefore(currentDate(), syncUntil.current)) return 3_000;
      return 15_000;
    },
    refetchIntervalInBackground: false,
  });
  return { query, visible };
}
