import { useCallback, useState } from 'react';

import type { Job } from '../../../../shared/api/types';

/** Full Job details opened in this run, so the Job tree can list their steps. */
export function useLoadedRunJobs() {
  const [loadedJobs, setLoadedJobs] = useState<Record<number, Job>>({});
  const onJobLoaded = useCallback(
    (job: Job) =>
      setLoadedJobs((previous) => {
        if (previous[job.id] === job) return previous;
        return { ...previous, [job.id]: job };
      }),
    [],
  );
  return { loadedJobs, onJobLoaded };
}
