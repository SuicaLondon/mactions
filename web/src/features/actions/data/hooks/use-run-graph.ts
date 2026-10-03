import { useQuery } from '@tanstack/react-query';

import { request } from '../../../../shared/api/client';
import { useQueryVisible } from '../../../../shared/hooks/use-query-visible';
import type { RunGraphData } from '../../runs/models/run-graph';
import { activityPath } from '../models/activity-data';
import type { JobSummary, WorkflowRun } from '../types/activity-types';

export function useRunGraph(run: WorkflowRun, jobs: JobSummary[]) {
  const queryKey = [
    'activity-run-graph',
    run.repository,
    run.id,
    run.attempt,
    jobs
      .map((job) => job.id)
      .sort((a, b) => a - b)
      .join(','),
  ];
  const visible = useQueryVisible(queryKey);
  const query = useQuery({
    queryKey,
    enabled: visible,
    queryFn: ({ signal }) =>
      request<RunGraphData>(
        activityPath('run-graph', {
          repository: run.repository,
          run_id: run.id,
          attempt: run.attempt,
        }),
        undefined,
        signal,
      ),
    staleTime: Infinity,
    gcTime: 10 * 60000,
  });
  return query;
}
