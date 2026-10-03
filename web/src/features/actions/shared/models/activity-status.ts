export function isActive(status: string) {
  return status !== 'completed';
}

export function matchesStatus(item: { status: string; conclusion: string | null }, filter: string) {
  if (filter === 'all') return true;
  if (filter === 'active') return isActive(item.status);
  return item.conclusion === filter || item.status === filter;
}
