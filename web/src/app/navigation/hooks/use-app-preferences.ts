import { useEffect, useState } from 'react';

import type { Scope } from '../../../features/actions/data/types/activity-types';

const NAVIGATION_KEY = 'mactions.navigation.v1';

export interface AppPreferences {
  view: 'runners' | 'runs';
  scope: Scope;
  runnerSearch: string;
  runSearch: string;
  runnerStatus: string;
  runStatus: string;
  device: string;
}

const DEFAULT_PREFERENCES: AppPreferences = {
  view: 'runners',
  scope: { organization: '', repository: '' },
  runnerSearch: '',
  runSearch: '',
  runnerStatus: 'all',
  runStatus: 'all',
  device: 'all',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function text(value: unknown) {
  if (typeof value === 'string') return value;
  return '';
}

function option(value: unknown, choices: string[]) {
  const saved = text(value);
  if (choices.includes(saved)) return saved;
  return 'all';
}

function readPreferences(): AppPreferences {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(NAVIGATION_KEY) ?? 'null');
    if (!isRecord(saved)) return DEFAULT_PREFERENCES;
    let scope: Record<string, unknown> = {};
    if (isRecord(saved.scope)) scope = saved.scope;
    const organization = text(scope.organization);
    let repository = text(scope.repository);
    if (organization && repository.split('/')[0].toLowerCase() !== organization.toLowerCase()) {
      repository = '';
    }
    let view: AppPreferences['view'] = 'runners';
    if (saved.view === 'runs') view = 'runs';
    return {
      view,
      scope: {
        organization,
        repository,
      },
      runnerSearch: text(saved.runnerSearch),
      runSearch: text(saved.runSearch),
      runnerStatus: option(saved.runnerStatus, ['all', 'active', 'stopped', 'attention']),
      runStatus: option(saved.runStatus, [
        'all',
        'active',
        'success',
        'failure',
        'cancelled',
        'skipped',
      ]),
      device: option(saved.device, ['all', 'this_device', 'other_device', 'unknown']),
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function useAppPreferences() {
  const [preferences, setPreferences] = useState(readPreferences);
  useEffect(() => {
    try {
      localStorage.setItem(NAVIGATION_KEY, JSON.stringify(preferences));
    } catch {
      /* Preferences remain usable without browser storage. */
    }
  }, [preferences]);
  return { preferences, setPreferences };
}
