import { cn } from '../../../../../shared/lib/cn';
import { RefreshButton } from '../../../../../shared/ui/controls/buttons/RefreshButton';
import { type useRuns } from '../../../data/hooks/use-runs';
import { refreshIntervalLabel } from '../../../data/models/activity-data';
import type { WorkflowRun } from '../../../data/types/activity-types';
import { StatusFilter } from '../../../shared/components/StatusFilter';
import { RunCount } from './RunCount';
import { type RunsView } from './RunsView';

export function RunListHeader({
  runnerName,
  query,
  runs,
  refreshSeconds,
  status,
  filter,
  setFilter,
}: {
  runnerName: Parameters<typeof RunsView>[0]['runnerName'];
  query: ReturnType<typeof useRuns>['query'];
  runs: WorkflowRun[];
  refreshSeconds: ReturnType<typeof useRuns>['refreshIntervalSeconds'];
  status: Parameters<typeof RunsView>[0]['status'];
  filter: string;
  setFilter: React.Dispatch<React.SetStateAction<string>>;
}) {
  let title = 'Workflow runs';
  if (runnerName) title = `Workflow runs for ${runnerName}`;
  return (
    <header
      className={cn(
        'activity-view-header mx-0 mt-0 mb-2.5 flex min-h-7.5 items-center',
        'justify-between gap-3',
      )}
    >
      <div>
        <p className="view-eyebrow mx-0 mt-1.25 mb-1 text-xs text-muted">GitHub Actions</p>
        <h2 className="m-0 text-base font-semibold">{title}</h2>
        <span className="run-list-count mt-1 inline-block text-xs text-muted">
          <RunCount query={query} runs={runs} />
        </span>
        {!!(refreshSeconds > 30) && (
          <span className="activity-refresh-note mt-1 block text-xs text-muted">
            Updates every {refreshIntervalLabel(refreshSeconds)}
          </span>
        )}
      </div>
      <div className="activity-view-controls flex items-center gap-2.5">
        {!!(status === undefined) && <StatusFilter value={filter} onChange={setFilter} />}
        <RefreshButton
          label="Refresh runs"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        />
      </div>
    </header>
  );
}
