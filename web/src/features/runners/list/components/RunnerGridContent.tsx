import type { Runner } from '../../../../shared/api/types';
import { runnerHeadingLayout } from '../../../../shared/ui/layout/list-layout';
import { LoadingPlaceholder } from '../../../../shared/ui/loading/components/LoadingPlaceholder';
import type { WorkflowRun } from '../../../actions/data/types/activity-types';
import type { RunnerSelection } from '../models/runner-list';
import type { RunnerListState } from '../models/runner-list-state';
import { RunnerListRow } from './row/RunnerListRow';
const EMPTY_RUNS: WorkflowRun[] = [];

export function RunnerGridContent({
  awaitingInventory,
  visible,
  detailsKey,
  work,
  connected,
  onOpen,
  onMenu,
  onDetails,
}: {
  awaitingInventory: RunnerListState['awaitingInventory'];
  visible: RunnerListState['visible'];
  detailsKey: string | undefined;
  work: RunnerListState['work'];
  connected: boolean | undefined;
  onOpen: (runner: RunnerSelection) => void;
  onMenu: (runner: Runner, x: number, y: number) => void;
  onDetails: (runner: RunnerSelection) => void;
}) {
  if (awaitingInventory) return <LoadingPlaceholder kind="runners" />;
  return (
    <div
      className="runner-grid shrink-0 overflow-hidden rounded-md border border-line"
      role="grid"
      aria-label="Runners"
    >
      <div className={runnerHeadingLayout} role="row">
        <span role="columnheader">Runner</span>
        <span role="columnheader" className="runner-heading-scope @max-md:hidden">
          Scope
        </span>
        <span role="columnheader">Status</span>
        <span role="columnheader" className="runner-heading-labels @max-5xl:hidden">
          Labels
        </span>
        <span role="columnheader" className="runner-heading-work @max-3xl:hidden">
          Current work
        </span>
        <span role="columnheader" aria-label="Actions" />
      </div>
      {visible.map((row) => (
        <RunnerListRow
          key={row.key}
          row={row}
          selected={detailsKey === row.key}
          runs={work.query.data?.runs ?? EMPTY_RUNS}
          loadingWork={connected === true && work.query.isPending}
          connected={connected}
          unavailableWork={Boolean(work.query.error)}
          onOpen={onOpen}
          onMenu={onMenu}
          onDetails={onDetails}
        />
      ))}
    </div>
  );
}
