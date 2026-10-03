import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { Scope, WorkflowRun } from '../../../features/actions/data/types/activity-types';
import type { RunnerSelection } from '../../../features/runners/list/models/runner-list';
import type { Job } from '../../../shared/api/types';
import {
  isRunsList,
  type Page,
  type PageContent,
  pageLabel,
  pageTitle,
} from '../models/app-navigation';
import { type AppPreferences, useAppPreferences } from './use-app-preferences';
import { usePageRestoration } from './use-page-restoration';

export function useAppNavigation(clearDetails: () => void) {
  const { preferences, setPreferences } = useAppPreferences();
  const client = useQueryClient();
  const [pages, setPages] = useState<Page[]>([{ key: 0, type: 'list' }]);
  const nextKey = useRef(0);
  const page = pages[pages.length - 1];
  const restoration = usePageRestoration(page, preferences);

  useEffect(() => {
    document.title = pageTitle(page, preferences.view);
  }, [page, preferences.view]);

  function goToPage(index: number) {
    const destination = pages[index];
    if (!destination || index >= pages.length - 1) return;
    restoration.restorePage(destination.key);
    restoration.discardPages(pages.slice(index + 1));
    setPages((previous) => previous.slice(0, index + 1));
  }

  function openPage(next: PageContent) {
    clearDetails();
    restoration.savePage();
    const destination: Page = { ...next, key: ++nextKey.current };
    setPages((previous) => [...previous, destination]);
  }

  function openHistory(job: Job) {
    if (page.type !== 'run') return;
    restoration.savePage();
    const previous = { ...page, selectedJobId: job.id, selectedJobName: job.name };
    const destination: Page = {
      key: ++nextKey.current,
      type: 'history',
      job,
      repository: page.run.repository,
      runner: page.runner,
    };
    setPages((current) => [...current.slice(0, -1), previous, destination]);
  }

  const updateRunSelection = useCallback(
    (selection: { jobId: number | null; stepNumber?: number }) => {
      setPages((previous) =>
        previous.map((item, index) => {
          if (index !== previous.length - 1 || item.type !== 'run') return item;
          const job = client
            .getQueryData<{ jobs: Pick<Job, 'id' | 'name'>[] }>([
              'activity-run',
              item.run.repository,
              item.run.id,
              item.run.attempt,
            ])
            ?.jobs.find((job) => job.id === selection.jobId);
          let step: Job['steps'][number] | undefined;
          if (selection.jobId) {
            step = client
              .getQueryData<Job>(['activity-job', item.run.repository, selection.jobId])
              ?.steps.find((step) => step.number === selection.stepNumber);
          }
          return {
            ...item,
            selectedJobId: selection.jobId ?? undefined,
            selectedJobName: job?.name,
            selectedStepNumber: selection.stepNumber,
            selectedStepName: step?.name,
          };
        }),
      );
    },
    [client],
  );

  function updateHistory(patch: { status?: string; expandedJobIds?: number[] }) {
    setPages((previous) =>
      previous.map((item, index) => {
        if (index === previous.length - 1 && item.type === 'history') return { ...item, ...patch };
        return item;
      }),
    );
  }

  function resetNavigation() {
    clearDetails();
    restoration.clear();
    setPages([{ key: ++nextKey.current, type: 'list' }]);
  }

  function openRun(run: WorkflowRun) {
    let runner: RunnerSelection | undefined;
    if (page.type === 'runner' || page.type === 'run' || page.type === 'history') {
      runner = page.runner;
    }
    openPage({ type: 'run', run, runner });
  }

  function changeScope(scope: Scope) {
    setPreferences((previous) => ({ ...previous, scope }));
    resetNavigation();
  }

  function changeView(view: AppPreferences['view']) {
    setPreferences((previous) => ({ ...previous, view }));
    resetNavigation();
  }

  return {
    preferences,
    setPreferences,
    pages,
    page,
    parent: pages[pages.length - 2],
    content: restoration.content,
    runsList: isRunsList(page, preferences.view),
    list: page.type === 'list' || page.type === 'runner',
    pageLabel: (item: Page) => pageLabel(item, preferences.view),
    goToPage,
    goBack: () => goToPage(pages.length - 2),
    openPage,
    openRun,
    openHistory,
    updateRunSelection,
    updateHistory,
    changeScope,
    changeView,
  };
}
