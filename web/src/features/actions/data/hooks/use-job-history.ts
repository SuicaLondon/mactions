import { useInfiniteQuery } from '@tanstack/react-query';
import { secondsToMilliseconds } from 'date-fns';
import { useMemo } from 'react';

import { request } from '../../../../shared/api/client';
import type { Job } from '../../../../shared/api/types';
import { useQueryVisible } from '../../../../shared/hooks/use-query-visible';
import { isActive } from '../../shared/models/activity-status';
import { activityPath, prepareJobHistory, refreshIntervalSeconds } from '../models/activity-data';
import type { JobHistoryPage } from '../types/activity-types';

export function useJobHistory(job: Job, repository: string, status = 'all') {
  const queryKey = ['activity-job-history', repository, job.workflow_id, job.name];
  const visible = useQueryVisible(queryKey, Boolean(job.workflow_id));
  const query = useInfiniteQuery({
    queryKey,
    enabled: visible,
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      request<JobHistoryPage>(
        activityPath('job-history', {
          repository,
          workflow_id: job.workflow_id,
          job_name: job.name,
          page: pageParam,
        }),
        undefined,
        signal,
      ),
    getNextPageParam: (page) => page.next_page ?? undefined,
    refetchInterval: (query) => {
      if (
        visible &&
        query.state.data?.pages.some((page) => page.jobs.some((item) => isActive(item.status)))
      )
        return secondsToMilliseconds(refreshIntervalSeconds(query.state.data.pages));
      return false;
    },
    refetchIntervalInBackground: false,
    staleTime: 20_000,
  });
  const history = useMemo(() => prepareJobHistory(query.data?.pages, status), [query.data, status]);
  return { query, ...history, refreshIntervalSeconds: refreshIntervalSeconds(query.data?.pages) };
}
