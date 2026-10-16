import { describe, expect, it } from 'vitest';

import type { Runner } from '../../../../shared/api/types';
import { actionDialogCopy } from './action-dialog-copy';
import { actionOperation } from './action-operation';

const runner = {
  id: 7,
  name: 'build-mac',
  github_status: 'online',
  busy: false,
} as unknown as Runner;
const entries = { labels: ' gpu, release ', registrationToken: '  ' };

describe('actionDialogCopy', () => {
  it('names label editing and keeps the action verb elsewhere', () => {
    expect(actionDialogCopy('labels', runner)).toMatchObject({
      title: 'Edit labels for build-mac',
      submitLabel: 'Save labels',
    });
    expect(actionDialogCopy('delete', runner)).toMatchObject({
      title: 'Delete build-mac?',
      submitLabel: 'Delete',
    });
  });

  it('warns about interrupted jobs unless GitHub reports the runner idle', () => {
    expect(actionDialogCopy('stop', runner).description).toBe(
      'This begins shutdown immediately. It is idle, so no job will be interrupted. Files are preserved and the runner stays stopped until you start it again.',
    );
    expect(actionDialogCopy('restart', { ...runner, busy: null }).description).toBe(
      'This begins shutdown immediately and may interrupt an active job. The runner starts again after shutdown completes.',
    );
    expect(actionDialogCopy('stop', { ...runner, busy: true }).description).toMatch(
      /may interrupt an active job/,
    );
  });
});

describe('actionOperation', () => {
  it('submits only the fields the action uses', () => {
    expect(actionOperation('labels', runner, entries).payload).toEqual({
      labels: ['gpu', 'release'],
    });
    expect(actionOperation('retry', runner, entries).payload).toEqual({});
    expect(
      actionOperation('retry', runner, { ...entries, registrationToken: ' token ' }).payload,
    ).toEqual({ registration_token: 'token' });
    expect(actionOperation('stop', runner, entries)).toEqual({
      path: '/api/runners/7/stop',
      payload: { confirm: true },
      message: 'Stopping build-mac…',
      success: 'build-mac stopped. GitHub status may take a moment to update.',
    });
  });
});
