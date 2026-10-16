import { useMemo } from 'react';

import { RefreshButton } from '../../../../shared/ui/controls/buttons/RefreshButton';
import { UpdateFailedIndicator } from '../../../../shared/ui/feedback/components/UpdateFailedIndicator';
import { useRunnerInventory } from '../../../actions/data/hooks/use-runner-inventory';
import { useRunnerWork } from '../../../actions/data/hooks/use-runner-work';
import type { ActivityRunner, Scope } from '../../../actions/data/types/activity-types';
import { useRunnerFetching } from '../../data/hooks/use-runner-fetching';
import { useInventoryUpdates } from '../hooks/use-inventory-updates';
import { useRunnerRows } from '../hooks/use-runner-rows';
import { useRunnerWorkState } from '../hooks/use-runner-work-state';
import { runnerDataAlert } from '../models/runner-data-alert';
import { runnerDataCoverage } from '../models/runner-data-coverage';
import { filterRunnerRows, type LocalRunners, type RunnerRowFilters } from '../models/runner-list';
import { type GitHubConnectionState, isCheckingGitHub } from '../models/runner-list-status';
import type { RunnerRowCallbacks } from '../models/runner-row';
import { AddRunnerButton } from './AddRunnerButton';
import { RunnerListRow } from './row/RunnerListRow';
import { RunnerDataNotes } from './RunnerDataNotes';
import { RunnerGrid } from './RunnerGrid';
import { RunnerListEmpty } from './RunnerListEmpty';
import { RunnerListHeader } from './RunnerListHeader';
import { RunnerLoadMore } from './RunnerLoadMore';

export interface RunnerListProps {
  scope: Scope;
  connection: GitHubConnectionState;
  local: LocalRunners;
  filters: RunnerRowFilters;
  /** The row whose details are open. */
  detailsKey?: string;
  rowCallbacks: RunnerRowCallbacks;
  onAdd: () => void;
  /** Runner operations in progress lock creation. */
  addDisabled?: boolean;
  onInventoryUpdate: (runners: ActivityRunner[]) => void;
}

export function RunnerList({
  scope,
  connection,
  local,
  filters: { search, status, device },
  detailsKey,
  rowCallbacks: { onOpen, onDetails, onMenu },
  onAdd,
  addDisabled = false,
  onInventoryUpdate,
}: RunnerListProps) {
  const connected = connection === 'connected';
  const localFetching = useRunnerFetching();
  const inventory = useRunnerInventory(scope, connected);
  const work = useRunnerWork(scope, connected);
  useInventoryUpdates(inventory.runners, onInventoryUpdate);
  const rows = useRunnerRows({
    scope,
    runners: local.runners,
    connected,
    inventory: inventory.runners,
    inventoryReady: inventory.query.isSuccess,
    inventoryMessage: inventory.message,
  });
  const visible = useMemo(
    () => filterRunnerRows(rows, { search, status, device }),
    [rows, search, status, device],
  );
  const workState = useRunnerWorkState(work.query, connection);
  const callbacks = useMemo(() => ({ onOpen, onDetails, onMenu }), [onOpen, onDetails, onMenu]);
  const checkingGitHub = isCheckingGitHub({
    hasInventory: Boolean(inventory.query.data),
    inventoryPending: inventory.query.isPending,
    connection,
  });
  const awaitingInventory = checkingGitHub && !rows.length;
  // A failed next page is reported beside Load more, not as unavailable inventory.
  let inventoryError = inventory.query.error;
  let nextPageError: Error | null = null;
  if (inventory.query.isFetchNextPageError) {
    nextPageError = inventory.query.error;
    inventoryError = null;
  }
  const workError = work.query.error;
  const alert = runnerDataAlert(inventoryError, workError);
  const coverage = runnerDataCoverage({
    connected,
    inventoryMessage: inventory.message,
    workMessage: work.query.data?.message,
    inventorySeconds: inventory.refreshIntervalSeconds,
    workSeconds: work.refreshIntervalSeconds,
  });
  return (
    <section className="@container flex flex-1 flex-col" aria-label="Managed runners">
      <RunnerListHeader count={rows.length} countLoading={checkingGitHub}>
        {/* Always rendered: a failure fills its reserved slot, so the header never grows. */}
        <UpdateFailedIndicator
          className="min-w-0 max-md:order-last max-md:basis-full max-md:justify-end"
          label={alert?.label ?? 'GitHub data unavailable'}
          error={alert?.error ?? null}
          retrying={inventory.query.isFetching || work.query.isFetching}
          onRetry={() => {
            if (inventoryError) void inventory.query.refetch();
            if (workError) void work.query.refetch();
          }}
        />
        <RefreshButton
          label="Refresh runners"
          disabled={localFetching || inventory.query.isFetching || work.query.isFetching}
          onClick={() => {
            local.onRefresh();
            if (connected) {
              void inventory.query.refetch();
              void work.query.refetch();
            }
          }}
        />
        <AddRunnerButton disabled={addDisabled} onAdd={onAdd} />
      </RunnerListHeader>
      <RunnerGrid loading={awaitingInventory}>
        {visible.map((row) => (
          <RunnerListRow
            key={row.key}
            row={row}
            selected={detailsKey === row.key}
            checkingGitHub={checkingGitHub}
            work={workState}
            callbacks={callbacks}
          />
        ))}
      </RunnerGrid>
      {!!(!visible.length && !awaitingInventory) && (
        <RunnerListEmpty
          rowCount={rows.length}
          local={local}
          localFetching={localFetching}
          onAdd={onAdd}
        />
      )}
      {!!coverage && <RunnerDataNotes coverage={coverage} />}
      <RunnerLoadMore
        hasMore={inventory.query.hasNextPage}
        loading={inventory.query.isFetchingNextPage}
        error={nextPageError}
        onLoadMore={() => void inventory.query.fetchNextPage()}
      />
    </section>
  );
}
