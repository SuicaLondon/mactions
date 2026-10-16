import { queryOptions } from '@tanstack/react-query';

import { getLocalRunners } from '../../../../shared/api/client';

export const RUNNERS_KEY = ['runners'] as const;

/** The local runner snapshot. Every observer shares these options, so the query keeps its fetcher. */
export const runnerSnapshotQuery = queryOptions({
  queryKey: RUNNERS_KEY,
  queryFn: ({ signal }) => getLocalRunners(signal),
});
