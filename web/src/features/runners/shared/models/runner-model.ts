import type { Filter, Runner } from '../../../../shared/api/types';
import type { ActivityRunner } from '../../../actions/data/types/activity-types';

export const runnerLabels = (runner: Runner) =>
  runner.github_labels ?? runner.labels.map((name) => ({ name, type: 'custom' }));

export function splitLabels(value: string) {
  if (!value.trim()) return [];
  return value.split(',').map((s) => s.trim());
}

export const needsAttention = (r: Runner) =>
  Boolean(r.error || r.github_error || r.local_error || r.interrupted || r.phase === 'failed');

/** GitHub has no registration to act on: setup never finished, or the runner was deregistered. */
export function isUnregistered(runner: Runner) {
  return !runner.github_id || runner.deregistered;
}

export interface RunnerStatusText {
  text: string;
  style: string;
}

/** Shown while GitHub has not answered yet, so no provisional status flips later. */
export const CHECKING_GITHUB_STATUS: RunnerStatusText = { text: 'Checking GitHub…', style: '' };

/** Status labels use sentence case regardless of the API's lowercase or snake_case values. */
export function statusLabel(value: string) {
  const text = value.replaceAll('_', ' ').trim();
  if (!text) return 'Unknown';
  return text.charAt(0).toLocaleUpperCase() + text.slice(1);
}

export function statusFor(r: Runner, checkingGitHub = false): RunnerStatusText {
  if (r.error || r.phase === 'failed') return { text: 'Needs attention', style: 'error' };
  if (r.interrupted) return { text: 'Interrupted', style: 'error' };
  if (!['ready', 'stopped', 'failed'].includes(r.phase))
    return { text: statusLabel(r.phase), style: 'working' };
  if (r.local_error) return { text: 'Local state unknown', style: 'error' };
  if (r.local_status === 'stopped') return { text: 'Stopped', style: '' };
  if (checkingGitHub && r.github_status === 'unknown') return CHECKING_GITHUB_STATUS;
  if (r.github_status === 'online') {
    if (r.busy) return { text: 'Busy', style: 'busy' };
    return { text: 'Idle', style: 'online' };
  }
  if (r.github_status === 'unknown' && r.local_status === 'running')
    return { text: 'Running locally', style: 'online' };
  if (r.github_status === 'unknown') return { text: 'Status unknown', style: '' };
  return { text: statusLabel(r.github_status || 'unknown'), style: '' };
}

export function remoteStatusFor(remote: ActivityRunner | undefined): RunnerStatusText {
  if (!remote) return { text: 'Unknown', style: '' };
  if (remote.status === 'online') {
    if (remote.busy) return { text: 'Busy', style: 'busy' };
    return { text: 'Idle', style: 'online' };
  }
  if (remote.busy) return { text: 'Busy', style: '' };
  return { text: statusLabel(remote.status), style: '' };
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
