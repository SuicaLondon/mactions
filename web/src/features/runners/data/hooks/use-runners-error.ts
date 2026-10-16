import { useQuery } from '@tanstack/react-query';

import { runnerSnapshotQuery } from '../models/runner-snapshot-query';

/** Why the last runner snapshot read failed, until a later read succeeds. */
export function useRunnersError() {
  return useQuery({ ...runnerSnapshotQuery, enabled: false }).error?.message;
}
