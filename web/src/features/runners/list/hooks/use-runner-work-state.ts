import type { UseQueryResult } from '@tanstack/react-query';
import { useMemo } from 'react';

import type { RunnerWork, WorkflowRun } from '../../../actions/data/types/activity-types';
import type { GitHubConnectionState } from '../models/runner-list-status';
import type { RunnerWorkState } from '../models/runner-row';

const EMPTY_RUNS: WorkflowRun[] = [];

/** One stable work summary for every memoized row; it changes only when the work does. */
export function useRunnerWorkState(
  work: Pick<UseQueryResult<RunnerWork>, 'data' | 'isPending' | 'error'>,
  connection: GitHubConnectionState,
): RunnerWorkState {
  const runs = work.data?.runs ?? EMPTY_RUNS;
  const connected = connection === 'connected';
  const loading = connection === 'checking' || (connected && work.isPending);
  const unavailable = Boolean(work.error);
  return useMemo(
    () => ({ runs, loading, connected, unavailable }),
    [runs, loading, connected, unavailable],
  );
}
