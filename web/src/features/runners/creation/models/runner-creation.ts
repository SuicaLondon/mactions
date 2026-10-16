export type RunnerRegistrationMode = 'automatic' | 'token';

export type RunnerScopeKind = 'repo' | 'org';

export type RunnerCreationStep = 1 | 2;

export interface RunnerCreationTarget {
  kind: RunnerScopeKind;
  name: string;
}

/** Values the opener chooses for a new Add runner session. */
export interface RunnerCreationSeed {
  initialMode?: RunnerRegistrationMode;
  initialTarget?: RunnerCreationTarget;
}

export interface RunnerCreationDraft {
  step: RunnerCreationStep;
  mode: RunnerRegistrationMode;
  kind: RunnerScopeKind;
  target: string;
  token: string;
  prefix: string;
  labels: string;
}

export interface RunnerCreationRequest {
  kind: RunnerScopeKind;
  target: string;
  prefix: string;
  labels: string;
  mode: RunnerRegistrationMode;
  token: string;
}

export function createDraft({ initialMode = 'automatic', initialTarget }: RunnerCreationSeed) {
  let step: RunnerCreationStep = 1;
  if (initialMode === 'token') step = 2;
  return {
    step,
    mode: initialMode,
    kind: initialTarget?.kind ?? 'repo',
    target: initialTarget?.name ?? '',
    token: '',
    prefix: 'mactions',
    labels: '',
  } satisfies RunnerCreationDraft;
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

export function creationRequest(draft: RunnerCreationDraft): RunnerCreationRequest {
  const { kind, prefix, labels, mode, token } = draft;
  return {
    kind,
    target: parseRunnerTarget(kind, draft.target).normalized,
    prefix,
    labels,
    mode,
    token,
  };
}
