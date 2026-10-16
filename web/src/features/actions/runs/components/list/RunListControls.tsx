import { cn } from '../../../../../shared/lib/cn';
import { RefreshButton } from '../../../../../shared/ui/controls/buttons/RefreshButton';
import { UpdateFailedIndicator } from '../../../../../shared/ui/feedback/components/UpdateFailedIndicator';
import { StatusFilter } from '../../../shared/components/StatusFilter';
import { type RefreshState } from '../../../shared/types/refresh-state';

/** The refresh status, the local status filter, and Refresh, beside the list title. */
export function RunListControls({
  refresh,
  filter,
  onFilterChange,
}: {
  refresh: RefreshState;
  /** The local status filter; undefined hides the control. */
  filter?: string;
  onFilterChange: (status: string) => void;
}) {
  return (
    // Wraps on phones, as in the Runners header: the reserved status slot takes its own line, so
    // the title keeps its width.
    <div
      className={cn(
        'flex min-w-0 flex-wrap items-center justify-end gap-2.5',
        'max-md:max-w-1/2',
        'max-md:gap-y-0.5',
      )}
    >
      <UpdateFailedIndicator
        className="min-w-0 max-md:order-last max-md:basis-full max-md:justify-end"
        error={refresh.error}
        retrying={refresh.refreshing}
        onRetry={refresh.onRefresh}
      />
      {filter !== undefined && <StatusFilter value={filter} onChange={onFilterChange} />}
      <RefreshButton
        label="Refresh runs"
        disabled={refresh.refreshing}
        onClick={refresh.onRefresh}
      />
    </div>
  );
}
