export type RunnerRegistrationMode = 'automatic' | 'token';

export type RunnerScopeKind = 'repo' | 'org';

export interface RunnerCreationTarget {
  kind: RunnerScopeKind;
  name: string;
}

export interface CreateRunnerOptions {
  onClose: () => void;
  locked: boolean;
  initializing?: boolean;
  initialMode?: RunnerRegistrationMode;
  initialTarget?: RunnerCreationTarget;
}

export function parseRunnerTarget(kind: RunnerScopeKind, target: string) {
  const rawTarget = target.trim().replace(/\/+$/, '');
  const githubPath = rawTarget.replace(/^https:\/\/github\.com\//i, '');
  let normalized = githubPath;
  if (kind === 'org' && rawTarget !== githubPath) normalized = githubPath.replace(/^orgs\//i, '');
  let pattern = /^[a-zA-Z0-9_.-]+$/;
  if (kind === 'repo') pattern = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;
  const valid = pattern.test(normalized);
  return { normalized, valid };
}
