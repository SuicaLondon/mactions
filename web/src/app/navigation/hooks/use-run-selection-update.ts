import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import type { Job } from '../../../shared/api/types';
import { useNavigationStore } from '../stores/navigation-store';

export interface RunSelection {
  jobId: number | null;
  stepNumber?: number;
}

/** Records the open Run's selected Job and Step with the names its breadcrumbs show. */
export function useRunSelectionUpdate() {
  const client = useQueryClient();
  return useCallback(
    (selection: RunSelection) => {
      const { pages, updateRunSelection } = useNavigationStore.getState();
      const page = pages[pages.length - 1];
      if (page.type !== 'run') return;
      const job = client
        .getQueryData<{ jobs: Pick<Job, 'id' | 'name'>[] }>([
          'activity-run',
          page.run.repository,
          page.run.id,
          page.run.attempt,
        ])
        ?.jobs.find((job) => job.id === selection.jobId);
      let stepName: string | undefined;
      if (selection.jobId) {
        stepName = client
          .getQueryData<Job>(['activity-job', page.run.repository, selection.jobId])
          ?.steps.find((step) => step.number === selection.stepNumber)?.name;
      }
      updateRunSelection({ ...selection, jobName: job?.name, stepName });
    },
    [client],
  );
}
