import { useEffect, useMemo } from 'react';

import type { Runner } from '../../../../shared/api/types';
import { useRunnerInventory } from '../../../actions/data/hooks/use-runner-inventory';
import { useRunnerWork } from '../../../actions/data/hooks/use-runner-work';
import type { ActivityRunner, Scope } from '../../../actions/data/types/activity-types';
import { useRunnerFetching } from '../../data/hooks/use-runner-fetching';
import { buildRunnerRows, filterRunnerRows } from '../models/runner-list';

export interface RunnerListOptions {
  scope: Scope;
  runners: Runner[];
  connected: boolean | undefined;
  search: string;
  status: string;
  device: string;
  controlledLocalFetching?: boolean;
  localError?: string;
  onInventoryUpdate: (runners: ActivityRunner[]) => void;
}

export function useRunnerList({
  scope,
  runners,
  connected,
  search,
  status,
  device,
  controlledLocalFetching,
  localError,
  onInventoryUpdate,
}: RunnerListOptions) {
  const fetching = useRunnerFetching();
  const localFetching = controlledLocalFetching ?? fetching;
  const inventory = useRunnerInventory(scope, connected === true);
  const work = useRunnerWork(scope, connected === true);
  useEffect(() => {
    onInventoryUpdate(inventory.runners);
  }, [inventory.runners, onInventoryUpdate]);
  const rows = useMemo(
    () =>
      buildRunnerRows({
        scope,
        runners,
        inventory: inventory.runners,
        connected,
        inventoryReady: inventory.query.isSuccess,
        inventoryMessage: inventory.message,
      }),
    [inventory.runners, inventory.query.isSuccess, inventory.message, runners, scope, connected],
  );
  const awaitingInventory =
    (connected === undefined || (connected && inventory.query.isPending)) && !rows.length;
  const visible = useMemo(
    () => filterRunnerRows(rows, { status, device, search }),
    [rows, status, device, search],
  );
  const hasDataNotes = Boolean(
    inventory.message ||
    work.query.data?.message ||
    inventory.query.error ||
    work.query.error ||
    (connected && (inventory.refreshIntervalSeconds > 30 || work.refreshIntervalSeconds > 30)),
  );
  let emptyTitle = 'No Runners';
  if (rows.length) emptyTitle = 'No Matching Runners';
  else if (localError) emptyTitle = 'Unable to load runners';
  return {
    inventory,
    work,
    localFetching,
    rows,
    awaitingInventory,
    visible,
    hasDataNotes,
    emptyTitle,
  };
}
