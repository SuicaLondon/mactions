export function isActive(status: string) {
  return status !== 'completed';
}

export function matchesStatus(item: { status: string; conclusion: string | null }, filter: string) {
  if (filter === 'all') return true;
  if (filter === 'active') return isActive(item.status);
  return item.conclusion === filter || item.status === filter;
}

/** Whether a job or run ended in a failure that needs attention. */
export function isFailed(item: { conclusion: string | null }) {
  return item.conclusion === 'failure' || item.conclusion === 'timed_out';
}
