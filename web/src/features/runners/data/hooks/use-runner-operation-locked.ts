import { useIsMutating } from '@tanstack/react-query';

import type { Snapshot } from '../../../../shared/api/types';
import { RUNNER_OPERATION_KEY } from './use-runner-operations';
import { useRunnerSnapshot } from './use-runner-snapshot';

const selectOperationRunning = (snapshot: Snapshot) => snapshot.operation_running;

/** An operation is running, from this page, another browser, or the CLI, so new ones wait. */
export function useRunnerOperationLocked() {
  const pending = useIsMutating({ mutationKey: RUNNER_OPERATION_KEY }) > 0;
  const running = useRunnerSnapshot(selectOperationRunning) === true;
  return pending || running;
}
