import type { Operation } from '../../../../shared/api/types';
import { useRunnerOperations } from './use-runner-operations';
import { useRunnerSnapshot } from './use-runner-snapshot';

export function useRunners(remote = true) {
  const operations = useRunnerOperations();
  const { query, visible } = useRunnerSnapshot({
    remote,
    pending: operations.pending,
    mutating: operations.mutating,
    syncUntil: operations.syncUntil,
  });
  const operationRunning = Boolean(query.data?.operation_running);
  return {
    query,
    pending: operations.pending,
    locked: operations.pending || operationRunning,
    notice: operations.notice,
    run: (operation: Operation) => operations.run(operation, operationRunning),
    refresh: () => {
      if (visible) void query.refetch({ cancelRefetch: false });
    },
  };
}
