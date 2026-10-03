import type { Filter, Runner } from '../../../../shared/api/types';

export const runnerLabels = (runner: Runner) =>
  runner.github_labels ?? runner.labels.map((name) => ({ name, type: 'custom' }));

export function splitLabels(value: string) {
  if (!value.trim()) return [];
  return value.split(',').map((s) => s.trim());
}

export const needsAttention = (r: Runner) =>
  Boolean(r.error || r.github_error || r.local_error || r.interrupted || r.phase === 'failed');

export function statusFor(r: Runner) {
  if (r.error || r.phase === 'failed') return { text: 'Needs attention', style: 'error' };
  if (r.interrupted) return { text: 'Interrupted', style: 'error' };
  if (!['ready', 'stopped', 'failed'].includes(r.phase))
    return { text: r.phase.replaceAll('_', ' '), style: 'working' };
  if (r.local_error) return { text: 'Local state unknown', style: 'error' };
  if (r.local_status === 'stopped') return { text: 'Stopped', style: '' };
  if (r.github_status === 'online') {
    if (r.busy) return { text: 'Busy', style: 'busy' };
    return { text: 'Idle', style: 'online' };
  }
  if (r.github_status === 'unknown' && r.local_status === 'running')
    return { text: 'Running locally', style: 'online' };
  if (r.github_status === 'unknown') return { text: 'Status unknown', style: '' };
  return { text: (r.github_status || 'unknown').replaceAll('_', ' '), style: '' };
}

export function filterRunners(rows: Runner[], filter: Filter, search: string) {
  const query = search.trim().toLocaleLowerCase();
  return rows.filter((r) => {
    const matches =
      filter === 'all' ||
      (filter === 'active' && r.local_status === 'running') ||
      (filter === 'stopped' && r.local_status === 'stopped') ||
      (filter === 'attention' && needsAttention(r));
    return (
      matches &&
      [r.name, r.target.name, ...runnerLabels(r).map((l) => l.name)]
        .join(' ')
        .toLocaleLowerCase()
        .includes(query)
    );
  });
}
