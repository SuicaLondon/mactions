import type { QueryKey } from '@tanstack/react-query';

import type { WorkflowRun } from '../../../features/actions/data/types/activity-types';
import type { RunnerSelection } from '../../../features/runners/list/models/runner-list';
import type { Job } from '../../../shared/api/types';
import type { AppPreferences } from '../hooks/use-app-preferences';

export type PageContent =
  | { type: 'list' }
  | { type: 'runner'; runner: RunnerSelection }
  | {
      type: 'run';
      run: WorkflowRun;
      runner?: RunnerSelection;
      selectedJobId?: number;
      selectedJobName?: string;
      selectedStepNumber?: number;
      selectedStepName?: string;
    }
  | { type: 'diagnostics'; runner: RunnerSelection }
  | {
      type: 'history';
      job: Job;
      repository: string;
      runner?: RunnerSelection;
      status?: string;
      expandedJobIds?: number[];
    };

export type Page = PageContent & { key: number };

export function isRunsList(page: Page, view: AppPreferences['view']) {
  return page.type === 'runner' || (page.type === 'list' && view === 'runs');
}

export function pageLabel(page: Page, view: AppPreferences['view']) {
  switch (page.type) {
    case 'list':
      if (view === 'runners') return 'Runners';
      return 'Runs';
    case 'runner':
      return page.runner.name;
    case 'run':
      return `${page.run.name} #${page.run.number}`;
    case 'diagnostics':
      return `${page.runner.name} logs`;
    case 'history':
      return 'History';
  }
}

export function pageTitle(page: Page, view: AppPreferences['view']) {
  let title: string;
  if (page.type === 'history') title = `${page.job.name} history`;
  else title = pageLabel(page, view);
  return `${title} · mactions`;
}

export function navigationQueryKey(page: Page, preferences: AppPreferences): QueryKey {
  if (page.type === 'run') {
    return ['activity-run', page.run.repository, page.run.id, page.run.attempt];
  }
  if (page.type === 'history') {
    return ['activity-job-history', page.repository, page.job.workflow_id, page.job.name];
  }
  if (isRunsList(page, preferences.view)) {
    let runnerId: number | 'all' = 'all';
    if (page.type === 'runner') runnerId = page.runner.githubId ?? 'all';
    return [
      'activity-runs',
      preferences.scope.organization,
      preferences.scope.repository,
      runnerId,
      preferences.runStatus,
    ];
  }
  return ['activity-runners', preferences.scope.organization, preferences.scope.repository];
}
