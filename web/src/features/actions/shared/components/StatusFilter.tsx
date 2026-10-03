import { SelectControl } from '../../../../shared/ui/controls/select/components/SelectControl';

export function StatusFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="activity-status-filter inline-flex items-center gap-1.75 text-xs text-muted">
      <span>Status</span>
      <SelectControl
        label="Filter by status"
        value={value}
        onChange={onChange}
        embedded={false}
        options={[
          { value: 'all', label: 'All statuses' },
          { value: 'active', label: 'Running and queued' },
          { value: 'success', label: 'Success' },
          { value: 'failure', label: 'Failure' },
          { value: 'cancelled', label: 'Cancelled' },
          { value: 'skipped', label: 'Skipped' },
        ]}
      />
    </div>
  );
}
