import { useMemo } from 'react';

import type { Runner } from '../../../../shared/api/types';
import type { ActivityRunner, Scope } from '../../../actions/data/types/activity-types';
import { buildRunnerRows } from '../models/runner-list';

export interface RunnerRowsInput {
  scope: Scope;
  runners: Runner[];
  connected: boolean;
  inventory: ActivityRunner[];
  inventoryReady: boolean;
  inventoryMessage: string;
}

/** Local runners merged with GitHub's inventory, memoized for the memoized rows. */
export function useRunnerRows({
  scope,
  runners,
  connected,
  inventory,
  inventoryReady,
  inventoryMessage,
}: RunnerRowsInput) {
  return useMemo(
    () =>
      buildRunnerRows({ scope, runners, inventory, connected, inventoryReady, inventoryMessage }),
    [scope, runners, inventory, connected, inventoryReady, inventoryMessage],
  );
}
