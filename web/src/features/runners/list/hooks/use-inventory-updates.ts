import { useEffect } from 'react';

import type { ActivityRunner } from '../../../actions/data/types/activity-types';

/** Reports each new GitHub inventory to the owner of the runner details. */
export function useInventoryUpdates(
  runners: ActivityRunner[],
  onInventoryUpdate: (runners: ActivityRunner[]) => void,
) {
  useEffect(() => {
    onInventoryUpdate(runners);
  }, [runners, onInventoryUpdate]);
}
