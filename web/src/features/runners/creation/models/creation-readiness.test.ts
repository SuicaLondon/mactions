import { describe, expect, it } from 'vitest';

import { type CreationReadinessInput, getCreationReadiness } from './creation-readiness';

function input(overrides: Partial<CreationReadinessInput> = {}): CreationReadinessInput {
  return {
    draft: { step: 2, mode: 'automatic', kind: 'repo', target: 'octo/app', token: '' },
    locked: false,
    initializing: false,
    connectionPending: false,
    connected: true,
    pending: false,
    ...overrides,
  };
}

describe('getCreationReadiness', () => {
  it('allows creating a valid connected target', () => {
    expect(getCreationReadiness(input())).toEqual({
      canContinue: true,
      canCreate: true,
      hint: '',
      waiting: null,
      waitingIsLoading: false,
    });
  });

  it('names the missing target for each mode and scope', () => {
    const draft = { step: 2, mode: 'automatic', kind: 'org', target: '', token: '' } as const;
    expect(getCreationReadiness(input({ draft })).hint).toBe('Choose an organization');
    expect(
      getCreationReadiness(input({ draft: { ...draft, mode: 'token', kind: 'repo' } })).hint,
    ).toBe('Enter a repository');
  });

  it('asks for a token or a connection before creating', () => {
    const token = { step: 2, mode: 'token', kind: 'repo', target: 'octo/app', token: ' ' } as const;
    expect(getCreationReadiness(input({ draft: token })).hint).toBe('Enter a registration token');
    expect(getCreationReadiness(input({ connected: false })).hint).toBe(
      'Connect GitHub to continue',
    );
    expect(getCreationReadiness(input({ connected: false })).canContinue).toBe(false);
  });

  it('waits for runner state and other operations instead of hinting', () => {
    const initializing = getCreationReadiness(input({ initializing: true, locked: true }));
    expect(initializing.waiting).toBe('Loading runner state…');
    expect(initializing.waitingIsLoading).toBe(true);
    expect(initializing.canCreate).toBe(false);
    const locked = getCreationReadiness(
      input({ locked: true, draft: { ...input().draft, target: '' } }),
    );
    expect(locked.waiting).toMatch(/Another runner operation/);
    expect(locked.waitingIsLoading).toBe(false);
    expect(locked.hint).toBe('');
  });

  it('blocks navigation and creation while the request is pending', () => {
    const readiness = getCreationReadiness(input({ pending: true }));
    expect(readiness.canContinue).toBe(false);
    expect(readiness.canCreate).toBe(false);
  });
});
