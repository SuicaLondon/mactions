import type { Runner } from '../../../../shared/api/types';
import type { ActivityRunner } from '../../../actions/data/types/activity-types';
import type { RunnerSelection } from '../../list/models/runner-list';

/** Keeps the inspected runner's GitHub state current as inventory pages arrive. */
export function withInventory(details: RunnerSelection | null, runners: ActivityRunner[]) {
  if (!details) return details;
  const remote = runners.find((runner) => {
    if (details.localId !== undefined) return runner.local_id === details.localId;
    return runner.github_id === details.githubId;
  });
  if (remote && remote !== details.remote) return { ...details, remote };
  return details;
}

export function localSelection(details: RunnerSelection | null, rows: Runner[]) {
  if (details?.localId === undefined) return undefined;
  return rows.find((runner) => runner.id === details.localId);
}

/** The local runner with the GitHub status last seen in the inventory. */
export function selectedRunner(details: RunnerSelection | null, rows: Runner[]) {
  const local = localSelection(details, rows);
  if (!local || !details?.remote) return local;
  return {
    ...local,
    github_status: details.remote.status,
    busy: details.remote.busy,
    github_labels: details.remote.github_labels ?? local.github_labels,
  };
}
