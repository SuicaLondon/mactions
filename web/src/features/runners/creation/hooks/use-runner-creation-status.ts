import { useMutationState } from '@tanstack/react-query';

import { RUNNER_CREATION_KEY } from './use-runner-creation';

/** Reads the Add runner request from any component in the dialog. */
export function useRunnerCreationStatus() {
  const states = useMutationState({
    filters: { mutationKey: RUNNER_CREATION_KEY },
    select: (mutation) => ({ status: mutation.state.status, error: mutation.state.error }),
  });
  const latest = states.at(-1);
  return { pending: latest?.status === 'pending', error: latest?.error ?? null };
}
