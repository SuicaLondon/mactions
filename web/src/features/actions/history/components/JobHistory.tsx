import { type ReactNode, useMemo } from 'react';

import { type Job } from '../../../../shared/api/types';
import { ErrorState } from '../../../../shared/ui/feedback/components/ErrorState';
import { useJobHistory } from '../../data/hooks/use-job-history';
import { refreshNote } from '../../data/models/activity-data';
import { pagedListStatus } from '../../data/models/paged-list-status';
import { type WorkflowRun } from '../../data/types/activity-types';
import { ActivityLoadMore } from '../../shared/components/ActivityLoadMore';
import { DataCoverageNotes } from '../../shared/components/DataCoverageNotes';
import { ActivityTableSkeleton } from '../../shared/components/table/ActivityTableSkeleton';
import { useControllableValue } from '../../shared/hooks/use-controllable-value';
import { toggleExpandedId } from '../../shared/models/expanded-ids';
import { sortHistoryByStart, summarizeHistory } from '../models/history-summary';
import { JobHistoryHeader } from './JobHistoryHeader';
import { JobHistorySummary } from './JobHistorySummary';
import { HistoryTable } from './table/HistoryTable';

const noExpandedJobs: number[] = [];

export function JobHistory({
  job,
  repository,
  highlightRunnerId,
  onOpenRun,
  statusFilter,
  onStatusFilterChange,
  expandedJobIds,
  onExpandedJobsChange,
}: {
  job: Job;
  repository: string;
  highlightRunnerId?: number;
  onOpenRun?: (run: WorkflowRun) => void;
  statusFilter?: string;
  onStatusFilterChange?: (status: string) => void;
  expandedJobIds?: number[];
  onExpandedJobsChange?: (ids: number[]) => void;
}) {
  const [filter, setFilter] = useControllableValue(statusFilter, onStatusFilterChange, 'all');
  const [expanded, setExpanded] = useControllableValue(
    expandedJobIds,
    onExpandedJobsChange,
    noExpandedJobs,
  );
  const {
    query,
    allJobs,
    jobs: loadedJobs,
    messages,
    refreshIntervalSeconds,
  } = useJobHistory(job, repository, filter);
  const jobs = useMemo(() => sortHistoryByStart(loadedJobs), [loadedJobs]);
  const list = pagedListStatus(query);
  // Only unfinished executions keep polling, so only they need the interval note.
  let note: string | null = null;
  if (allJobs.some((item) => item.status !== 'completed')) {
    note = refreshNote(refreshIntervalSeconds);
  }
  const retry = () => void query.refetch();
  const workflowKnown = Boolean(job.workflow_id);
  let emptyMessage = 'No history found for this job.';
  if (allJobs.length > 0) {
    emptyMessage = 'No loaded jobs match this status. Load more history or change the filter.';
  }
  let historyList: ReactNode = null;
  if (jobs.length) {
    historyList = (
      <HistoryTable
        jobs={jobs}
        repository={repository}
        highlightRunnerId={highlightRunnerId}
        currentJobId={job.id}
        onOpenRun={onOpenRun}
        expanded={expanded}
        toggleJob={(id, open) => setExpanded(toggleExpandedId(expanded, id, open))}
      />
    );
  } else if (list.hasData) {
    historyList = (
      <p className="m-0 grid flex-1 place-items-center p-5 text-muted">{emptyMessage}</p>
    );
  }
  let results = (
    <>
      {!!list.loadError && (
        <ErrorState
          title="Couldn't load job history"
          error={list.loadError}
          retrying={list.refreshing}
          onRetry={retry}
        />
      )}
      {!!list.loading && <ActivityTableSkeleton kind="history" />}
      {historyList}
      <DataCoverageNotes messages={messages} />
      <ActivityLoadMore
        nextPage={list.nextPage}
        label="Load more history"
        subject="history"
        onLoadMore={() => void query.fetchNextPage()}
      />
    </>
  );
  // History is found by the Job's workflow, so it shows only once GitHub reports it.
  if (!workflowKnown) {
    results = (
      <p className="m-0 grid flex-1 place-items-center p-5 text-muted">
        GitHub has not reported the workflow identity needed to find this job's history.
      </p>
    );
  }
  return (
    <section aria-label={`History for ${job.name}`}>
      <JobHistoryHeader
        jobName={job.name}
        workflow={job.workflow}
        repository={repository}
        refreshNote={note}
        refresh={{ error: list.refreshError, refreshing: list.refreshing, onRefresh: retry }}
        canRefresh={workflowKnown}
        statusFilter={filter}
        onStatusFilterChange={setFilter}
      />
      {!!(workflowKnown && !list.loadError) && (
        <JobHistorySummary
          loading={query.isPending}
          summary={summarizeHistory(allJobs, jobs, filter)}
        />
      )}
      {results}
    </section>
  );
}
