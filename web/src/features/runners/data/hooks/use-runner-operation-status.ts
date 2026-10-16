import { useMutationState } from '@tanstack/react-query';

import type { Operation } from '../../../../shared/api/types';
import { RUNNER_OPERATION_KEY } from './use-runner-operations';

export interface RunnerOperationStatus {
  pending: boolean;
  /** The operation in progress, used to mark its runner and action as pending. */
  active: Operation | undefined;
}

export function useRunnerOperationStatus(): RunnerOperationStatus {
  const operations = useMutationState({
    filters: { mutationKey: RUNNER_OPERATION_KEY, status: 'pending' },
    select: (mutation) => mutation.state.variables as Operation,
  });
  const active = operations.at(-1);
  return { pending: active !== undefined, active };
}
