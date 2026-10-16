import { useIsMutating, useQuery } from '@tanstack/react-query';
import { isBefore } from 'date-fns';

import { useQueryVisible } from '../../../../shared/hooks/use-query-visible';
import { currentDate } from '../../../../shared/lib/date';
import { RUNNERS_KEY, runnerSnapshotQuery } from '../models/runner-snapshot-query';
import { useRunnerOperationStore } from '../stores/runner-operation-store';
import { RUNNER_OPERATION_KEY } from './use-runner-operations';

/**
 * Loads and polls the local runner snapshot while the page is visible. App mounts it once.
 * Components read the snapshot through hooks that never fetch, so a poll rerenders only the
 * components whose values changed; this hook reads no result and rerenders its host only when
 * the page's visibility or the operation state changes.
 */
export function useRunnerPolling() {
  const visible = useQueryVisible(RUNNERS_KEY);
  const operating = useIsMutating({ mutationKey: RUNNER_OPERATION_KEY }) > 0;
  useQuery({
    ...runnerSnapshotQuery,
    enabled: visible,
    refetchInterval: (query) => {
      if (!visible) return false;
      if (operating || query.state.data?.operation_running) return 1_500;
      if (isBefore(currentDate(), useRunnerOperationStore.getState().syncUntil)) return 3_000;
      return 15_000;
    },
    refetchIntervalInBackground: false,
  });
}
