import { RefreshIcon } from '../../../../../shared/ui/icons/actions/RefreshIcon';
import { LoadingPlaceholder } from '../../../../../shared/ui/loading/components/LoadingPlaceholder';
import { useRunGraph } from '../../../data/hooks/use-run-graph';
import type { JobSummary, WorkflowRun } from '../../../data/types/activity-types';
import { RunGraph } from './RunGraph';

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
  if (query.isPending && !query.error) return <LoadingPlaceholder kind="graph" />;
  const graph = query.data ?? {
    state: 'unavailable',
    message: query.error?.message || 'Workflow dependencies are unavailable.',
    nodes: [],
    unmapped_job_ids: jobs.map((job) => job.id),
    source: null,
  };
  return (
    <>
      <RunGraph
        graph={graph}
        jobs={jobs}
        highlightRunnerId={highlightRunnerId}
        onSelect={onSelect}
      />
      {!!(Boolean(query.error) || graph.state === 'unavailable') && (
        <button
          className={'run-graph-retry mx-5 mt-0 mb-4 text-xs'}
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          <RefreshIcon className="size-3.25" />
          Retry graph
        </button>
      )}
    </>
  );
}
