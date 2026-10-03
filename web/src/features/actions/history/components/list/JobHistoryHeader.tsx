import { cn } from '../../../../../shared/lib/cn';
import { RefreshButton } from '../../../../../shared/ui/controls/buttons/RefreshButton';
import { type useJobHistory } from '../../../data/hooks/use-job-history';
import { refreshIntervalLabel } from '../../../data/models/activity-data';
import type { JobSummary } from '../../../data/types/activity-types';
import { StatusFilter } from '../../../shared/components/StatusFilter';
import { type JobHistory } from './JobHistory';

export function JobHistoryHeader({
  job,
  repository,
  refreshSeconds,
  allJobs,
  filter,
  onStatusChange,
  setLocalFilter,
  query,
}: {
  job: Parameters<typeof JobHistory>[0]['job'];
  repository: Parameters<typeof JobHistory>[0]['repository'];
  refreshSeconds: ReturnType<typeof useJobHistory>['refreshIntervalSeconds'];
  allJobs: JobSummary[];
  filter: string;
  onStatusChange: Parameters<typeof JobHistory>[0]['onStatusChange'];
  setLocalFilter: React.Dispatch<React.SetStateAction<string>>;
  query: ReturnType<typeof useJobHistory>['query'];
}) {
  return (
    <header
      className={cn(
        'activity-view-header mx-0 mt-0 mb-2.5 flex min-h-7.5 items-center',
        'justify-between gap-3 max-sm:flex-col max-sm:items-stretch',
      )}
    >
      <div>
        <p className="view-eyebrow mx-0 mt-1.25 mb-1 text-xs text-muted">
          GitHub Actions · Job history
        </p>
        <h2 className="m-0 text-base font-semibold">{job.name}</h2>
        <p className="history-scope mt-1.25 text-xs text-muted">
          {repository} · {job.workflow}
        </p>
        {!!(refreshSeconds > 30 && allJobs.some((item) => item.status !== 'completed')) && (
          <span className="activity-refresh-note mt-1 block text-xs text-muted">
            Updates every {refreshIntervalLabel(refreshSeconds)}
          </span>
        )}
      </div>
      <div className="activity-view-controls flex flex-wrap items-center gap-2.5">
        <StatusFilter value={filter} onChange={onStatusChange ?? setLocalFilter} />
        <RefreshButton
          label="Refresh job history"
          disabled={query.isFetching || !job.workflow_id}
          onClick={() => void query.refetch()}
        />
      </div>
    </header>
  );
}
