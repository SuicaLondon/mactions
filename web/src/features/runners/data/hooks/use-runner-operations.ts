import { useMutation, useQueryClient } from '@tanstack/react-query';

import { request } from '../../../../shared/api/client';
import type { Operation } from '../../../../shared/api/types';
import type { OperationCallbacks } from '../models/operation-notice';
import { operationErrorMessage, SUCCESS_MESSAGE } from '../models/operation-notice';
import { RUNNERS_KEY, runnerSnapshotQuery } from '../models/runner-snapshot-query';
import { useRunnerOperationStore } from '../stores/runner-operation-store';

export const RUNNER_OPERATION_KEY = ['runner-operation'];

/** Starts local fleet operations; status and notices live in shared state. */
export function useRunnerOperations() {
  const client = useQueryClient();
  // These callbacks belong to the mutation, so they still run after the caller unmounts.
  const mutation = useMutation({
    mutationKey: RUNNER_OPERATION_KEY,
    mutationFn: (operation: Operation) => request(operation.path, operation.payload),
    onMutate: async (operation) => {
      useRunnerOperationStore.getState().show('progress', operation.message);
      await client.cancelQueries({ queryKey: RUNNERS_KEY });
    },
    onSuccess: (_data, operation) =>
      useRunnerOperationStore.getState().show('success', operation.success ?? SUCCESS_MESSAGE),
    onError: (error) =>
      useRunnerOperationStore.getState().show('error', operationErrorMessage(error)),
    onSettled: (_data, _error, operation) => {
      useRunnerOperationStore.getState().release(operation.path);
      // Hidden-page queries are disabled. Invalidation is serviced when the page is visible.
      void client.invalidateQueries({ queryKey: RUNNERS_KEY });
      void client.invalidateQueries({
        predicate: (query) => String(query.queryKey[0]).startsWith('activity-'),
      });
    },
  });

  function run(operation: Operation, callbacks?: OperationCallbacks) {
    // Another browser or the CLI may hold the manager's operation lock.
    const operationRunning = client.getQueryData(runnerSnapshotQuery.queryKey)?.operation_running;
    if (operationRunning || !useRunnerOperationStore.getState().claim()) return;
    // TanStack Query runs these only while the caller is mounted, after the mutation's own.
    mutation.mutate(operation, {
      onSuccess: () => callbacks?.onSuccess?.(),
      onError: (error) => {
        callbacks?.onError?.(operationErrorMessage(error));
        // A caller that shows the failure in place replaces the error toast.
        if (callbacks?.reportsErrors) useRunnerOperationStore.getState().clearNotice();
      },
    });
  }

  return run;
}
