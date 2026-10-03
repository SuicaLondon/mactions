import { useState } from 'react';

import { cn } from '../../../../../shared/lib/cn';
import { LoadingPlaceholder } from '../../../../../shared/ui/loading/components/LoadingPlaceholder';
import { useRuns } from '../../../data/hooks/use-runs';
import type { Scope, WorkflowRun } from '../../../data/types/activity-types';
import { RunListHeader } from './RunListHeader';
import { RunsLoadMoreLabel } from './RunsLoadMoreLabel';
import { RunTable } from './RunTable';

export function RunsView({
  scope,
  runnerId,
  runnerName,
  onOpenRun,
  search,
  status,
}: {
  scope: Scope;
  runnerId?: number;
  runnerName?: string;
  onOpenRun: (run: WorkflowRun) => void;
  search?: string;
  status?: string;
}) {
  const [filter, setFilter] = useState('all');
  const {
    query,
    allRuns,
    runs,
    messages,
    refreshIntervalSeconds: refreshSeconds,
  } = useRuns(scope, runnerId, status ?? filter, search);
  let label = 'Workflow runs';
  if (runnerName) label = `Runs for ${runnerName}`;
  let emptyMessage = 'No runs found in this scope with the selected status.';
  if (!runs.length && !query.isPending && !query.error && allRuns.length) {
    emptyMessage = 'No loaded runs match these filters. Load more history or change the filters.';
  }
  return (
    <section className="activity-runs" aria-label={label}>
      <RunListHeader
        runnerName={runnerName}
        query={query}
        runs={runs}
        refreshSeconds={refreshSeconds}
        status={status}
        filter={filter}
        setFilter={setFilter}
      />
      {!!query.error && (
        <p
          className={cn(
            'error-message m-0 mx-0 rounded-md border border-red-500/20 bg-red-500/4 px-3',
            'py-2.5 text-xs leading-normal wrap-anywhere whitespace-pre-wrap text-danger',
          )}
          role="alert"
        >
          {query.error.message}
        </p>
      )}
      {!!(query.isPending && !query.error) && <LoadingPlaceholder kind="runs" />}
      {!!runs.length && <RunTable runs={runs} onOpenRun={onOpenRun} />}
      {!!(!runs.length && !query.isPending && !query.error) && (
        <p className="panel-empty m-0 grid flex-1 place-items-center p-5 text-muted">
          {emptyMessage}
        </p>
      )}
      {!!messages.length && (
        <details className="activity-data-notes mx-0 mt-2.5 max-w-225 text-xs text-muted">
          <summary className="cursor-pointer">Data coverage</summary>
          {messages.map((message) => (
            <p className="my-2 leading-relaxed" key={message}>
              {message}
            </p>
          ))}
        </details>
      )}
      {!!query.hasNextPage && (
        <button
          className="activity-load-more mx-auto my-3 flex text-xs"
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          <RunsLoadMoreLabel query={query} />
        </button>
      )}
    </section>
  );
}
