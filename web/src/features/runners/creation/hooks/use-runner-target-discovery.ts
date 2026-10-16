import { useConnection } from '../../../github/hooks/use-connection';
import { useRunnerCreationStore } from '../stores/runner-creation-store';
import { useRunnerTargets } from './use-runner-targets';

/** Target choices for the picker; only mounted while the picker is shown. */
export function useRunnerTargetDiscovery() {
  const connection = useConnection();
  const kind = useRunnerCreationStore((state) => state.kind);
  return useRunnerTargets(kind, connection.data?.login, Boolean(connection.data?.connected));
}
