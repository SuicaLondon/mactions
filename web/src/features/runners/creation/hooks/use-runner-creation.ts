import { useMutation, useQueryClient } from '@tanstack/react-query';

import { request } from '../../../../shared/api/client';
import { RUNNERS_KEY } from '../../data/models/runner-snapshot-query';
import { splitLabels } from '../../shared/models/runner-model';
import { type RunnerCreationRequest } from '../models/runner-creation';
import { useRunnerCreationStore } from '../stores/runner-creation-store';

export const RUNNER_CREATION_KEY = ['runner-creation'];

export function useRunnerCreation(onCreated: () => void) {
  const client = useQueryClient();
  return useMutation({
    mutationKey: RUNNER_CREATION_KEY,
    mutationFn: ({ kind, target, prefix, labels, mode, token }: RunnerCreationRequest) => {
      const payload = { kind, target, prefix, labels: splitLabels(labels) };
      if (mode === 'token')
        return request('/api/runners', { ...payload, registration_token: token });
      return request('/api/runners', payload);
    },
    onError: (error) => {
      useRunnerCreationStore.getState().setFailure(error.message);
    },
    onSuccess: () => {
      useRunnerCreationStore.getState().setFailure(null);
      onCreated();
    },
    onSettled: () => {
      void client.invalidateQueries({ queryKey: RUNNERS_KEY });
    },
    // The dialog's request disappears with it, so a reopened dialog starts without an error.
    gcTime: 0,
  });
}
