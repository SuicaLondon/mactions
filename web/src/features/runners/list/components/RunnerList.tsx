import type { Runner } from '../../../../shared/api/types';
import { cn } from '../../../../shared/lib/cn';
import { RefreshButton } from '../../../../shared/ui/controls/buttons/RefreshButton';
import type { ActivityRunner, Scope } from '../../../actions/data/types/activity-types';
import { useRunnerList } from '../hooks/use-runner-list';
import { type RunnerSelection } from '../models/runner-list';
import { RunnerCount } from './RunnerCount';
import { RunnerDataNotes } from './RunnerDataNotes';
import { RunnerGridContent } from './RunnerGridContent';
import { RunnerListEmpty } from './RunnerListEmpty';
import { RunnerLoadMoreLabel } from './RunnerLoadMoreLabel';

export function RunnerList({
  scope,
  runners,
  connected,
  search,
  status,
  device,
  detailsKey,
  onOpen,
  onDetails,
  onMenu,
  onAdd,
  onRefreshLocal,
  localFetching: controlledLocalFetching,
  localError,
  onInventoryUpdate,
}: {
  scope: Scope;
  runners: Runner[];
  connected: boolean | undefined;
  search: string;
  status: string;
  device: string;
  detailsKey?: string;
  onOpen: (runner: RunnerSelection) => void;
  onDetails: (runner: RunnerSelection) => void;
  onMenu: (runner: Runner, x: number, y: number) => void;
  onAdd: () => void;
  onRefreshLocal: () => void;
  localFetching?: boolean;
  localError?: string;
  onInventoryUpdate: (runners: ActivityRunner[]) => void;
}) {
  const {
    inventory,
    work,
    localFetching,
    rows,
    awaitingInventory,
    visible,
    hasDataNotes,
    emptyTitle,
  } = useRunnerList({
    scope,
    runners,
    connected,
    search,
    status,
    device,
    controlledLocalFetching,
    localError,
    onInventoryUpdate,
  });
  return (
    <section
      className="runner-list-view @container flex flex-1 flex-col"
      aria-label="Managed runners"
    >
      <header
        className={cn(
          'activity-view-header mx-0 mt-0 mb-2.5 flex min-h-7.5 shrink-0 items-center',
          'justify-between gap-3',
        )}
      >
        <div>
          <h2 className="m-0 text-base font-semibold">
            Runners{' '}
            <span className="ml-1.25 text-xs font-normal text-muted">
              <RunnerCount awaitingInventory={awaitingInventory} rows={rows} />
            </span>
          </h2>
        </div>
        <RefreshButton
          iconOnly
          label="Refresh runners"
          disabled={localFetching || inventory.query.isFetching || work.query.isFetching}
          onClick={() => {
            onRefreshLocal();
            if (connected) {
              void inventory.query.refetch();
              void work.query.refetch();
            }
          }}
        />
      </header>
      <RunnerGridContent
        awaitingInventory={awaitingInventory}
        visible={visible}
        detailsKey={detailsKey}
        work={work}
        connected={connected}
        onOpen={onOpen}
        onMenu={onMenu}
        onDetails={onDetails}
      />
      {!!(!visible.length && !awaitingInventory) && (
        <RunnerListEmpty
          rowCount={rows.length}
          localError={localError}
          localFetching={localFetching}
          emptyTitle={emptyTitle}
          onRefreshLocal={onRefreshLocal}
          onAdd={onAdd}
        />
      )}
      {!!hasDataNotes && (
        <RunnerDataNotes inventory={inventory} work={work} connected={connected} />
      )}
      {!!inventory.query.hasNextPage && (
        <button
          className="activity-load-more mx-auto my-3 flex text-xs"
          disabled={inventory.query.isFetchingNextPage}
          onClick={() => void inventory.query.fetchNextPage()}
        >
          <RunnerLoadMoreLabel inventory={inventory} />
        </button>
      )}
    </section>
  );
}
