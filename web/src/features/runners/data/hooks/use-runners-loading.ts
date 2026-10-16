import { useQuery } from '@tanstack/react-query';

import { runnerSnapshotQuery } from '../models/runner-snapshot-query';

/** True until the first runner snapshot arrives or fails; later polls never change it. */
export function useRunnersLoading() {
  return useQuery({ ...runnerSnapshotQuery, enabled: false }).isPending;
}
