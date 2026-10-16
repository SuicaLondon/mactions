import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import type { RunActivity } from '../../../features/actions/data/types/activity-types';
import type { Job } from '../../../shared/api/types';
import { runPagePatch } from '../models/page-hydration';
import { useNavigationStore } from '../stores/navigation-store';

/** Names Run pages opened from a URL as their Run, Job, and Step data loads. */
export function usePageHydration() {
  const client = useQueryClient();
  useEffect(() => {
    function hydrate() {
      const { pages, hydrateRun } = useNavigationStore.getState();
      for (const page of pages) {
        if (page.type !== 'run') continue;
        const { repository, id, attempt } = page.run;
        const activity = client.getQueryData<RunActivity>([
          'activity-run',
          repository,
          id,
          attempt,
        ]);
        let job: Job | undefined;
        if (page.selectedJobId !== undefined) {
          job = client.getQueryData<Job>(['activity-job', repository, page.selectedJobId]);
        }
        const patch = runPagePatch(page, activity, job);
        if (patch) hydrateRun(page.key, patch);
      }
    }
    hydrate();
    const unsubscribeCache = client.getQueryCache().subscribe((event) => {
      if (event.type === 'updated') hydrate();
    });
    const unsubscribeStore = useNavigationStore.subscribe((state, previous) => {
      // Hydrate after this update finishes notifying, so listeners see updates in order.
      if (state.pages !== previous.pages) queueMicrotask(hydrate);
    });
    return () => {
      unsubscribeCache();
      unsubscribeStore();
    };
  }, [client]);
}
