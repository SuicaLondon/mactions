import { useShallow } from 'zustand/react/shallow';

import { useConnection } from '../../../github/hooks/use-connection';
import { getCreationReadiness } from '../models/creation-readiness';
import { useRunnerCreationStore } from '../stores/runner-creation-store';
import { useRunnerCreationStatus } from './use-runner-creation-status';

export interface CreationAvailability {
  locked: boolean;
  initializing: boolean;
}

export function useCreationReadiness({ locked, initializing }: CreationAvailability) {
  const connection = useConnection();
  const { pending } = useRunnerCreationStatus();
  const draft = useRunnerCreationStore(
    useShallow(({ step, mode, kind, target, token }) => ({ step, mode, kind, target, token })),
  );
  return getCreationReadiness({
    draft,
    locked,
    initializing,
    connectionPending: connection.isPending,
    connected: Boolean(connection.data?.connected),
    pending,
  });
}
