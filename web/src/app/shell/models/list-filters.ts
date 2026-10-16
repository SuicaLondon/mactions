const RUNNER_FILTER_COPY = {
  filterLabel: 'Runner filters',
  searchLabel: 'Search runners',
  // Accessible names include the visible field label (Status, Device).
  statusLabel: 'Runner status',
  statusOptions: [
    { value: 'all', label: 'All runners', muted: true },
    { value: 'active', label: 'Active' },
    { value: 'stopped', label: 'Stopped / Offline' },
    { value: 'attention', label: 'Needs attention' },
  ],
};

const RUN_FILTER_COPY = {
  filterLabel: 'Run filters',
  searchLabel: 'Search runs',
  statusLabel: 'Run status',
  statusOptions: [
    { value: 'all', label: 'All statuses', muted: true },
    { value: 'active', label: 'Running and queued' },
    { value: 'success', label: 'Success' },
    { value: 'failure', label: 'Failure' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'skipped', label: 'Skipped' },
  ],
};

export function listFilterCopy(runsList: boolean) {
  if (runsList) return RUN_FILTER_COPY;
  return RUNNER_FILTER_COPY;
}
