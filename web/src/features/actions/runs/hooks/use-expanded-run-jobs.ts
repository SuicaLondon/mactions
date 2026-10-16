import { useCallback, useState } from 'react';

import { toggleExpandedId, withExpandedId } from '../../shared/models/expanded-ids';

/** Which Jobs in a run's Job tree show their steps. */
export function useExpandedRunJobs(initialJobId: number | undefined) {
  const [expandedJobIds, setExpandedJobIds] = useState<number[]>(() => {
    if (initialJobId === undefined) return [];
    return [initialJobId];
  });
  const expandJob = useCallback(
    ({ jobId }: { jobId: number }) =>
      setExpandedJobIds((previous) => withExpandedId(previous, jobId)),
    [],
  );
  const toggleJob = useCallback(
    (jobId: number, expanded: boolean) =>
      setExpandedJobIds((previous) => toggleExpandedId(previous, jobId, expanded)),
    [],
  );
  return { expandedJobIds, expandJob, toggleJob };
}
