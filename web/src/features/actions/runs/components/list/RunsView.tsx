import { type ReactNode, useState } from 'react';

import { ErrorState } from '../../../../../shared/ui/feedback/components/ErrorState';
import { useRuns } from '../../../data/hooks/use-runs';
import { refreshNote } from '../../../data/models/activity-data';
import { pagedListStatus } from '../../../data/models/paged-list-status';
import { type Scope, type WorkflowRun } from '../../../data/types/activity-types';
import { ActivityLoadMore } from '../../../shared/components/ActivityLoadMore';
import { DataCoverageNotes } from '../../../shared/components/DataCoverageNotes';
import { ActivityTableSkeleton } from '../../../shared/components/table/ActivityTableSkeleton';
import { RunListControls } from './RunListControls';
import { RunListHeader } from './RunListHeader';
import { RunsEmpty } from './RunsEmpty';
import { RunTable } from './RunTable';

export function RunsView({
  scope,
  runnerId,
  runnerName,
  onOpenRun,
  search,
  statusFilter,
}: {
  scope: Scope;
  runnerId?: number;
  runnerName?: string;
  onOpenRun: (run: WorkflowRun) => void;
  search?: string;
  /** A caller-owned status filter, which replaces the local filter control. */
  statusFilter?: string;
}) {
  const [filter, setFilter] = useState('all');
  const { query, allRuns, runs, messages, refreshIntervalSeconds } = useRuns(
    scope,
    runnerId,
    statusFilter ?? filter,
    search,
  );
  const list = pagedListStatus(query);
  let label = 'Workflow runs';
  if (runnerName) label = `Runs for ${runnerName}`;
  let shownFilter: string | undefined;
  if (statusFilter === undefined) shownFilter = filter;
  // GitHub may still have older pages after an empty first page, so offer a search, not "more".
  let loadMoreLabel = 'Load more runs';
  if (!allRuns.length) loadMoreLabel = 'Search older runs';
  const retry = () => void query.refetch();
  let runList: ReactNode = null;
  if (runs.length) {
    runList = <RunTable runs={runs} onOpenRun={onOpenRun} />;
  } else if (list.hasData) {
    runList = <RunsEmpty scope={scope} runnerName={runnerName} filtered={allRuns.length > 0} />;
  }
  return (
    <section aria-label={label}>
      <RunListHeader
        runnerName={runnerName}
        countLoading={query.isPending}
        runCount={runs.length}
        refreshNote={refreshNote(refreshIntervalSeconds)}
      >
        <RunListControls
          refresh={{ error: list.refreshError, refreshing: list.refreshing, onRefresh: retry }}
          filter={shownFilter}
          onFilterChange={setFilter}
        />
      </RunListHeader>
      {!!list.loadError && (
        <ErrorState
          className="min-h-88"
          title="Couldn't load workflow runs"
          error={list.loadError}
          retrying={list.refreshing}
          onRetry={retry}
        />
      )}
      {!!list.loading && <ActivityTableSkeleton kind="runs" />}
      {runList}
      <DataCoverageNotes messages={messages} />
      <ActivityLoadMore
        nextPage={list.nextPage}
        label={loadMoreLabel}
        subject="runs"
        onLoadMore={() => void query.fetchNextPage()}
      />
    </section>
  );
}
