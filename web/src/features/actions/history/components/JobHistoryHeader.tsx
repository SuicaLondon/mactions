import { cn } from '../../../../shared/lib/cn';
import type { RefreshState } from '../../shared/types/refresh-state';
import { JobHistoryControls } from './JobHistoryControls';

export function JobHistoryHeader({
  jobName,
  workflow,
  repository,
  refreshNote,
  refresh,
  canRefresh,
  statusFilter,
  onStatusFilterChange,
}: {
  jobName: string;
  workflow: string;
  repository: string;
  refreshNote: string | null;
  refresh: RefreshState;
  /** History can load only once GitHub reports the Job's workflow. */
  canRefresh: boolean;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
}) {
  // A reloaded page may not know the workflow name yet; empty parts are left out.
  const scope = ['Job history', repository, workflow].filter(Boolean).join(' · ');
  return (
    <header
      className={cn(
        'mx-0 mt-0 mb-2.5 flex min-h-7.5 items-center',
        'justify-between gap-3 max-sm:flex-col max-sm:items-stretch',
      )}
    >
      <div className="min-w-0">
        <h2 className="m-0 text-base font-semibold">{jobName}</h2>
        {/* One line that truncates, so a long repository never leaves a separator ending a line. */}
        <p className="mt-1.25 truncate text-xs text-muted" title={scope}>
          {scope}
        </p>
        {!!refreshNote && <span className="mt-1 block text-xs text-muted">{refreshNote}</span>}
      </div>
      <JobHistoryControls
        refresh={refresh}
        canRefresh={canRefresh}
        statusFilter={statusFilter}
        onStatusFilterChange={onStatusFilterChange}
      />
    </header>
  );
}
