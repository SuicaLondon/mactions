import { parseRunnerTarget, type RunnerCreationDraft } from './runner-creation';

export interface CreationReadinessInput {
  draft: Pick<RunnerCreationDraft, 'step' | 'mode' | 'kind' | 'target' | 'token'>;
  locked: boolean;
  initializing: boolean;
  connectionPending: boolean;
  connected: boolean;
  pending: boolean;
}

export interface CreationReadiness {
  canContinue: boolean;
  canCreate: boolean;
  /** Names what still blocks Create runner, so the disabled button is never unexplained. */
  hint: string;
  waiting: string | null;
  waitingIsLoading: boolean;
}

function waitingMessage({
  draft,
  locked,
  initializing,
  connectionPending,
}: CreationReadinessInput) {
  if (initializing) return 'Loading runner state…';
  if (locked) return 'Another runner operation is in progress. Waiting for it to finish…';
  if (draft.mode === 'automatic' && connectionPending) return 'Checking GitHub connection…';
  return null;
}

function blockingHint({ draft, connected }: CreationReadinessInput, valid: boolean) {
  if (!valid) {
    let targetName = 'a repository';
    if (draft.kind === 'org') targetName = 'an organization';
    if (draft.mode === 'automatic') return `Choose ${targetName}`;
    return `Enter ${targetName}`;
  }
  if (draft.mode === 'token' && !draft.token.trim()) return 'Enter a registration token';
  if (draft.mode === 'automatic' && !connected) return 'Connect GitHub to continue';
  return '';
}

export function getCreationReadiness(input: CreationReadinessInput): CreationReadiness {
  const { draft, locked, initializing, connectionPending, connected, pending } = input;
  const { valid } = parseRunnerTarget(draft.kind, draft.target);
  const waiting = waitingMessage(input);
  let registrationReady = connected;
  if (draft.mode === 'token') registrationReady = Boolean(draft.token.trim());
  let hint = '';
  if (draft.step === 2 && !pending && !waiting) hint = blockingHint(input, valid);
  return {
    canContinue: !pending && (draft.mode === 'token' || connected),
    canCreate: !pending && !locked && valid && registrationReady,
    hint,
    waiting,
    waitingIsLoading: initializing || (!locked && connectionPending),
  };
}
