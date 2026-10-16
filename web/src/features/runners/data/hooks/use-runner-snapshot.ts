import { useQuery } from '@tanstack/react-query';

import type { Snapshot } from '../../../../shared/api/types';
import { runnerSnapshotQuery } from '../models/runner-snapshot-query';

/**
 * Reads one value from the runner snapshot that useRunnerPolling keeps current, without
 * fetching. The caller rerenders only when the selected value changes.
 */
export function useRunnerSnapshot<T>(select: (snapshot: Snapshot) => T) {
  return useQuery({ ...runnerSnapshotQuery, enabled: false, select }).data;
}
