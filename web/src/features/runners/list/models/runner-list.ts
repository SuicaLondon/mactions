import type { Runner } from '../../../../shared/api/types';
import type { ActivityRunner, Device, Scope } from '../../../actions/data/types/activity-types';
import { needsAttention, runnerLabels } from '../../shared/models/runner-model';

export interface RunnerSelection {
  key: string;
  githubId?: number;
  localId?: number;
  name: string;
  remote?: ActivityRunner;
}

export interface DisplayRunner extends RunnerSelection {
  local?: Runner;
  device: Device;
  labels: string[];
  scopeUnconfirmed?: boolean;
}

export interface RunnerRowsOptions {
  scope: Scope;
  runners: Runner[];
  inventory: ActivityRunner[];
  connected: boolean | undefined;
  inventoryReady: boolean;
  inventoryMessage: string;
}

export function localInScope(runner: Runner, scope: Scope) {
  if (scope.repository) {
    if (runner.target.kind === 'repo')
      return runner.target.name.toLowerCase() === scope.repository.toLowerCase();
    return runner.target.name.toLowerCase() === scope.repository.split('/')[0].toLowerCase();
  }
  if (!scope.organization) return true;
  let organization = runner.target.name;
  if (runner.target.kind === 'repo') organization = runner.target.name.split('/')[0];
  return organization.toLowerCase() === scope.organization.toLowerCase();
}

export function buildRunnerRows({
  scope,
  runners,
  inventory,
  connected,
  inventoryReady,
  inventoryMessage,
}: RunnerRowsOptions): DisplayRunner[] {
  const localById = new Map(runners.map((runner) => [runner.id, runner]));
  const localIds = new Set<number>();
  const rows: DisplayRunner[] = inventory.map((remote) => {
    let saved: Runner | undefined;
    if (remote.local_id !== null) saved = localById.get(remote.local_id);
    let local: Runner | undefined;
    let key = `github-${remote.github_id}`;
    let device = remote.device;
    if (saved) {
      local = {
        ...saved,
        github_status: remote.status,
        busy: remote.busy,
        github_labels: remote.github_labels ?? saved.github_labels,
      };
      localIds.add(local.id);
      key = `local-${local.id}`;
      device = 'this_device';
    }
    return {
      key,
      name: local?.name ?? remote.name,
      githubId: remote.github_id ?? undefined,
      localId: local?.id,
      local,
      remote,
      device,
      labels: remote.labels,
    };
  });
  const hideUnconfirmed =
    connected && inventoryReady && !inventoryMessage.toLowerCase().includes('unavailable');
  for (const runner of runners) {
    if (!localInScope(runner, scope) || localIds.has(runner.id)) continue;
    const scopeUnconfirmed = Boolean(scope.repository && runner.target.kind === 'org');
    if (scopeUnconfirmed && hideUnconfirmed) continue;
    rows.push({
      key: `local-${runner.id}`,
      name: runner.name,
      githubId: runner.github_id ?? undefined,
      localId: runner.id,
      local: runner,
      device: 'this_device',
      labels: runnerLabels(runner).map((label) => label.name),
      scopeUnconfirmed,
    });
    localIds.add(runner.id);
  }
  return rows;
}

export function filterRunnerRows(
  rows: DisplayRunner[],
  { status, device, search }: { status: string; device: string; search: string },
) {
  const query = search.trim().toLowerCase();
  return rows.filter((row) => {
    let active = row.remote?.status === 'online';
    let stopped = row.remote?.status === 'offline';
    if (row.local) {
      active = row.local.local_status === 'running';
      stopped = row.local.local_status === 'stopped';
    }
    const matchesStatus =
      status === 'all' ||
      (status === 'active' && active) ||
      (status === 'stopped' && stopped) ||
      (status === 'attention' && row.local && needsAttention(row.local));
    return (
      matchesStatus &&
      (device === 'all' || row.device === device) &&
      [row.name, row.local?.target.name ?? row.remote?.target?.name ?? '', ...row.labels]
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  });
}
