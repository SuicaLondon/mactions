import { useMutation, useQueryClient } from '@tanstack/react-query';

import { request } from '../../../../shared/api/client';
import { RUNNERS_KEY } from '../../data/hooks/use-runner-snapshot';
import { splitLabels } from '../../shared/models/runner-model';
import { type RunnerRegistrationMode, type RunnerScopeKind } from '../models/runner-creation';

export interface RunnerCreationOptions {
  kind: RunnerScopeKind;
  target: string;
  prefix: string;
  labels: string;
  mode: RunnerRegistrationMode;
  token: string;
  onCreated: () => void;
}

export function useRunnerCreation({
  kind,
  target,
  prefix,
  labels,
  mode,
  token,
  onCreated,
}: RunnerCreationOptions) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => {
      const payload = { kind, target, prefix, labels: splitLabels(labels) };
      if (mode === 'token')
        return request('/api/runners', { ...payload, registration_token: token });
      return request('/api/runners', payload);
    },
    onSuccess: onCreated,
    onSettled: () => {
      void client.invalidateQueries({ queryKey: RUNNERS_KEY });
    },
    gcTime: 0,
  });
}
