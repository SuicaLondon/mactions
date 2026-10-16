import type { QueryKey } from '@tanstack/react-query';

import type { WorkflowRun } from '../../../features/actions/data/types/activity-types';
import type { RunnerSelection } from '../../../features/runners/list/models/runner-list';
import type { Job } from '../../../shared/api/types';
import type { AppPreferences } from './app-preferences';

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
      // A Run opened from a URL is named once its summary loads; the breadcrumb shows a skeleton.
      if (!page.run.name) return 'Run';
      return `${page.run.name} #${page.run.number}`;
    case 'diagnostics':
      return `${page.runner.name} logs`;
    case 'history':
      return 'History';
  }
}

/** Names the page Back actually restores: a Run returns with its selected Job open. */
export function backLabel(page: Page, view: AppPreferences['view']) {
  if (page.type === 'run' && page.selectedJobName) return page.selectedJobName;
  return pageLabel(page, view);
}

export type BackDestination =
  | { type: 'job'; label: string; jobId: number }
  | { type: 'run'; label: string }
  | { type: 'page'; label: string };

/**
 * Back first leaves the Step or Job selected inside the current Run, the way its breadcrumbs do,
 * then returns to the previous page.
 */
export function backDestination(pages: Page[], view: AppPreferences['view']): BackDestination {
  const page = pages.at(-1);
  const parent = pages.at(-2);
  if (page?.type === 'run' && page.selectedJobId !== undefined) {
    if (page.selectedStepNumber !== undefined && page.selectedJobName) {
      return { type: 'job', label: page.selectedJobName, jobId: page.selectedJobId };
    }
    return { type: 'run', label: pageLabel(page, view) };
  }
  if (!parent) return { type: 'page', label: 'Runners' };
  return { type: 'page', label: backLabel(parent, view) };
}

/** Names what the current page shows, down to its selected Job or Step. */
export function currentPageHeading(page: Page, view: AppPreferences['view']) {
  if (page.type === 'history') return `${page.job.name} history`;
  if (page.type !== 'run') return pageLabel(page, view);
  if (page.selectedStepNumber !== undefined && page.selectedStepName) return page.selectedStepName;
  if (page.selectedJobName) return page.selectedJobName;
  return pageLabel(page, view);
}

/**
 * Names the selected Job or Step for the phone page bar, whose own headings truncate them. Other
 * pages already show their name in a full-width heading, so the bar does not repeat it.
 */
export function compactPageHeading(page: Page, view: AppPreferences['view']) {
  if (page.type !== 'run' || page.selectedJobId === undefined) return null;
  if (!page.selectedJobName) return null;
  return currentPageHeading(page, view);
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

export type PageTransition =
  | { type: 'none' }
  | { type: 'forward'; from: Page }
  | { type: 'back'; to: Page; discarded: Page[] }
  | { type: 'reset' };

/** Classifies a history change so scroll and cached data can follow the visited pages. */
export function pageTransition(previous: Page[], next: Page[]): PageTransition {
  const from = previous[previous.length - 1];
  const to = next[next.length - 1];
  if (from.key === to.key) return { type: 'none' };
  const keys = new Set(next.map((page) => page.key));
  if (!previous.some((page) => keys.has(page.key))) return { type: 'reset' };
  if (keys.has(from.key)) return { type: 'forward', from };
  return { type: 'back', to, discarded: previous.filter((page) => !keys.has(page.key)) };
}
