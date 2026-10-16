import { describe, expect, it } from 'vitest';

import { connectionErrorMessages, isAuthorizationFailed } from './connection-errors';

describe('connectionErrorMessages', () => {
  it('reports authorization polling and cancellation failures alongside start failures', () => {
    expect(
      connectionErrorMessages({
        connection: null,
        auth: new Error('Manager unreachable'),
        connect: new Error('Device flow failed.'),
        cancel: new Error('Nothing to cancel'),
      }).map(({ message }) => message),
    ).toEqual([
      'Could not start GitHub authorization: Device flow failed. Try again, or run mactions auth login in the host terminal.',
      'Could not cancel GitHub authorization: Nothing to cancel. Try again, or let the code expire.',
      'Could not read GitHub authorization progress: Manager unreachable. Reload the dashboard, or run mactions auth login in the host terminal.',
    ]);
  });

  it('reports the same underlying failure only once', () => {
    const offline = new Error('Failed to fetch');
    expect(
      connectionErrorMessages({
        connection: offline,
        auth: offline,
        connect: null,
        cancel: null,
      }),
    ).toEqual([
      {
        key: 'auth',
        message:
          'Could not read GitHub authorization progress: Failed to fetch. Reload the dashboard, or run mactions auth login in the host terminal.',
      },
    ]);
  });
});

describe('isAuthorizationFailed', () => {
  it('treats failed and expired attempts as failures', () => {
    expect(isAuthorizationFailed({ status: 'failed', code: null, url: '' })).toBe(true);
    expect(isAuthorizationFailed({ status: 'expired', code: null, url: '' })).toBe(true);
    expect(isAuthorizationFailed({ status: 'pending', code: 'ABCD', url: '' })).toBe(false);
    expect(isAuthorizationFailed(undefined)).toBe(false);
  });
});
