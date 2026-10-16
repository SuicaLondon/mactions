import { useMemo } from 'react';

import { RefreshIcon } from '../../../../../shared/ui/icons/RefreshIcon';
import { useRunGraph } from '../../../data/hooks/use-run-graph';
import type { JobSummary, WorkflowRun } from '../../../data/types/activity-types';
import type { RefreshState } from '../../../shared/types/refresh-state';
import { RunFailureCallout } from './RunFailureCallout';
import { RunGraph } from './RunGraph';
import { RunGraphSkeleton } from './RunGraphSkeleton';

export function RunGraphOverview({
  run,
  jobs,
  highlightRunnerId,
  onSelect,
}: {
  run: WorkflowRun;
  jobs: JobSummary[];
  highlightRunnerId?: number;
  onSelect: (jobId: number) => void;
}) {
  const query = useRunGraph(run, jobs);
  // With earlier data on screen, a failed refresh is reported in the graph header instead.
  let refreshError: Error | null = null;
  if (query.data) refreshError = query.error;
  const { isFetching, refetch } = query;
  // Stable between polls, so the memoized graph does not rerender on each one.
  const refresh = useMemo<RefreshState>(
    () => ({ error: refreshError, refreshing: isFetching, onRefresh: () => void refetch() }),
    [refreshError, isFetching, refetch],
  );
  // Phones show the callout above the Jobs disclosure in RunDetail instead.
  const failures = <RunFailureCallout jobs={jobs} onSelect={onSelect} className="max-md:hidden" />;
  if (query.isPending && !query.error) {
    return (
      <>
        {failures}
        <RunGraphSkeleton />
      </>
    );
  }
  const graph = query.data ?? {
    state: 'unavailable',
    message: query.error?.message || 'Workflow dependencies are unavailable.',
    nodes: [],
    unmapped_job_ids: jobs.map((job) => job.id),
    source: null,
  };
  return (
    <>
      {failures}
      <RunGraph
        graph={graph}
        jobs={jobs}
        highlightRunnerId={highlightRunnerId}
        refresh={refresh}
        onSelect={onSelect}
      />
      {graph.state === 'unavailable' && (
        <button
          type="button"
          className="mx-5 mt-0 mb-4 text-xs"
          disabled={isFetching}
          onClick={refresh.onRefresh}
        >
          <RefreshIcon className="size-3.25" />
          Retry graph
        </button>
      )}
    </>
  );
}
