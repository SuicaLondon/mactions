import { create } from 'zustand';

import type { Scope, WorkflowRun } from '../../../features/actions/data/types/activity-types';
import { useRunnerInspectorStore } from '../../../features/runners/inspector/stores/runner-inspector-store';
import type { RunnerSelection } from '../../../features/runners/list/models/runner-list';
import type { Job } from '../../../shared/api/types';
import type { Page, PageContent } from '../models/app-navigation';
import {
  type AppPreferences,
  DEFAULT_PREFERENCES,
  readPreferences,
  writePreferences,
} from '../models/app-preferences';
import type { RunPagePatch } from '../models/page-hydration';
import { mergeLocation, type PageLocation, parseLocation } from '../models/page-location';

export interface RunSelectionUpdate {
  jobId: number | null;
  jobName?: string;
  stepNumber?: number;
  stepName?: string;
}

export interface NavigationStore {
  pages: Page[];
  nextKey: number;
  preferences: AppPreferences;
  /** Starts an app session from saved preferences on the page the URL names, or the list page. */
  restore: () => void;
  /** Moves to a URL's pages after browser Back or Forward; null returns to the list. */
  applyLocation: (location: PageLocation | null) => void;
  /** Fills in names a page opened from a URL could not carry. */
  hydrateRun: (key: number, patch: RunPagePatch) => void;
  goToPage: (index: number) => void;
  goBack: () => void;
  openPage: (next: PageContent) => void;
  openRun: (run: WorkflowRun) => void;
  openHistory: (job: Job) => void;
  updateRunSelection: (selection: RunSelectionUpdate) => void;
  updateHistory: (patch: { status?: string; expandedJobIds?: number[] }) => void;
  updatePreferences: (patch: Partial<AppPreferences>) => void;
  changeScope: (scope: Scope) => void;
  changeView: (view: AppPreferences['view']) => void;
}

function currentPage(pages: Page[]) {
  return pages[pages.length - 1];
}

function updateLast(pages: Page[], update: (page: Page) => Page) {
  return pages.map((page, index) => {
    if (index !== pages.length - 1) return page;
    return update(page);
  });
}

export const useNavigationStore = create<NavigationStore>()((set, get) => {
  function open(destination: PageContent) {
    useRunnerInspectorStore.getState().clearDetails();
    set(({ pages, nextKey }) => ({
      pages: [...pages, { ...destination, key: nextKey + 1 }],
      nextKey: nextKey + 1,
    }));
  }

  // Changing what the list shows starts a new history from that list.
  function resetWith(patch: Partial<AppPreferences>) {
    useRunnerInspectorStore.getState().clearDetails();
    const preferences = { ...get().preferences, ...patch };
    writePreferences(preferences);
    set(({ nextKey }) => ({
      preferences,
      pages: [{ key: nextKey + 1, type: 'list' }],
      nextKey: nextKey + 1,
    }));
  }

  return {
    pages: [{ key: 0, type: 'list' }],
    nextKey: 0,
    preferences: DEFAULT_PREFERENCES,
    restore: () => {
      let preferences = readPreferences();
      const location = parseLocation(window.location.hash);
      let targets: PageContent[] = [{ type: 'list' }];
      if (location) {
        preferences = { ...preferences, view: location.view };
        targets = location.pages;
      }
      writePreferences(preferences);
      set({ ...mergeLocation([], targets, -1), preferences });
    },
    applyLocation: (location) => {
      const state = get();
      let target: PageLocation = { view: state.preferences.view, pages: [{ type: 'list' }] };
      if (location) target = location;
      if (target.view !== state.preferences.view) {
        useRunnerInspectorStore.getState().clearDetails();
        const preferences = { ...state.preferences, view: target.view };
        writePreferences(preferences);
        set({ ...mergeLocation([], target.pages, state.nextKey), preferences });
        return;
      }
      const merged = mergeLocation(state.pages, target.pages, state.nextKey);
      if (merged.pages === state.pages) return;
      if (merged.pages.at(-1)?.key !== currentPage(state.pages).key) {
        useRunnerInspectorStore.getState().clearDetails();
      }
      set(merged);
    },
    hydrateRun: (key, patch) =>
      set(({ pages }) => ({
        pages: pages.map((page) => {
          if (page.key !== key || page.type !== 'run') return page;
          return { ...page, ...patch };
        }),
      })),
    goToPage: (index) => {
      const { pages } = get();
      if (!pages[index] || index >= pages.length - 1) return;
      set({ pages: pages.slice(0, index + 1) });
    },
    goBack: () => get().goToPage(get().pages.length - 2),
    openPage: open,
    openRun: (run) => {
      const page = currentPage(get().pages);
      let runner: RunnerSelection | undefined;
      if (page.type === 'runner' || page.type === 'run' || page.type === 'history') {
        runner = page.runner;
      }
      open({ type: 'run', run, runner });
    },
    openHistory: (job) => {
      const { pages, nextKey } = get();
      const page = currentPage(pages);
      if (page.type !== 'run') return;
      const previous = { ...page, selectedJobId: job.id, selectedJobName: job.name };
      const destination: Page = {
        key: nextKey + 1,
        type: 'history',
        job,
        repository: page.run.repository,
        runner: page.runner,
      };
      set({ pages: [...pages.slice(0, -1), previous, destination], nextKey: nextKey + 1 });
    },
    updateRunSelection: ({ jobId, jobName, stepNumber, stepName }) =>
      set(({ pages }) => ({
        pages: updateLast(pages, (page) => {
          if (page.type !== 'run') return page;
          return {
            ...page,
            selectedJobId: jobId ?? undefined,
            selectedJobName: jobName,
            selectedStepNumber: stepNumber,
            selectedStepName: stepName,
          };
        }),
      })),
    updateHistory: (patch) =>
      set(({ pages }) => ({
        pages: updateLast(pages, (page) => {
          if (page.type !== 'history') return page;
          return { ...page, ...patch };
        }),
      })),
    updatePreferences: (patch) => {
      const preferences = { ...get().preferences, ...patch };
      writePreferences(preferences);
      set({ preferences });
    },
    changeScope: (scope) => resetWith({ scope }),
    changeView: (view) => resetWith({ view }),
  };
});
