import type { Scope } from '../../../features/actions/data/types/activity-types';
import type { RunnerCreationTarget } from '../../../features/runners/creation/models/runner-creation';
import type { Action, Runner } from '../../../shared/api/types';

export type RunnerModalState =
  | { type: 'create' }
  | { type: 'storage' }
  | { type: 'action'; runner: Runner; action: Action; error?: string }
  | null;

export interface RunnerMenuState {
  runner: Runner;
  x: number;
  y: number;
}

/** Add runner starts with the repository or organization the list is scoped to. */
export function creationTarget(scope: Scope): RunnerCreationTarget | undefined {
  if (scope.repository) return { kind: 'repo', name: scope.repository };
  if (scope.organization) return { kind: 'org', name: scope.organization };
  return undefined;
}

/** A menu opened from GitHub inventory shows current local state with GitHub's status. */
export function currentMenu(menu: RunnerMenuState | null, rows: Runner[]) {
  if (!menu) return menu;
  const local = rows.find((runner) => runner.id === menu.runner.id);
  if (!local) return menu;
  return {
    ...menu,
    runner: {
      ...local,
      github_status: menu.runner.github_status,
      busy: menu.runner.busy,
      github_labels: menu.runner.github_labels ?? local.github_labels,
    },
  };
}
