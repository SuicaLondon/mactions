import { describe, expect, it } from 'vitest';

import { runnerLogFileOptions } from './runner-log-view';

describe('runnerLogFileOptions', () => {
  it('offers the latest log before each available file', () => {
    expect(runnerLogFileOptions(undefined)).toEqual([{ value: '', label: 'Latest runner log' }]);
    expect(runnerLogFileOptions([{ name: 'service.log', bytes: 1, modified: 0 }])).toEqual([
      { value: '', label: 'Latest runner log' },
      { value: 'service.log', label: 'service.log' },
    ]);
  });
});
