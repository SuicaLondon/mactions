import { RefreshButton } from '../../../../shared/ui/controls/buttons/RefreshButton';
import { UpdateFailedIndicator } from '../../../../shared/ui/feedback/components/UpdateFailedIndicator';
import { StatusFilter } from '../../shared/components/StatusFilter';
import type { RefreshState } from '../../shared/types/refresh-state';

/** The refresh status, the status filter, and Refresh, beside the title. */
export function JobHistoryControls({
  refresh,
  canRefresh,
  statusFilter,
  onStatusFilterChange,
}: {
  refresh: RefreshState;
  canRefresh: boolean;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* Phones move the reserved indicator below so the filter and Refresh share a row. */}
      <UpdateFailedIndicator
        className="max-sm:order-last"
        error={refresh.error}
        retrying={refresh.refreshing}
        onRetry={refresh.onRefresh}
      />
      <div className="flex items-center gap-1.5">
        <StatusFilter value={statusFilter} onChange={onStatusFilterChange} />
        <RefreshButton
          label="Refresh job history"
          disabled={refresh.refreshing || !canRefresh}
          onClick={refresh.onRefresh}
        />
      </div>
    </div>
  );
}
