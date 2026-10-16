import { expect, it } from 'vitest';

import { DEFAULT_PREFERENCES } from '../../navigation/models/app-preferences';
import { activeFilterCount } from './list-filters';

const filtered = {
  ...DEFAULT_PREFERENCES,
  runnerSearch: 'mac',
  scope: { organization: 'acme', repository: 'acme/app' },
  runnerStatus: 'active',
  device: 'this_device',
  runStatus: 'failure',
};

it.each([
  ['defaults with a search', { ...DEFAULT_PREFERENCES, runnerSearch: 'mac' }, false, true, 0],
  ['runner scope, status, and device', filtered, false, true, 4],
  ['runner filters without scope', filtered, false, false, 2],
  [
    'run status without the runner-only device',
    { ...filtered, scope: DEFAULT_PREFERENCES.scope },
    true,
    true,
    1,
  ],
])('activeFilterCount counts %s', (_label, preferences, runsList, showScope, expected) => {
  expect(activeFilterCount(preferences, { runsList, showScope })).toBe(expected);
});
