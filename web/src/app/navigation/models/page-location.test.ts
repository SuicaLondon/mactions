import { describe, expect, it } from 'vitest';

import type { WorkflowRun } from '../../../features/actions/data/types/activity-types';
import type { Job } from '../../../shared/api/types';
import { buildJob, workflowRun } from '../../../test/app-harness';
import type { Page } from './app-navigation';
import { mergeLocation, pageIdentity, pageLocation, parseLocation } from './page-location';

const run: WorkflowRun = {
  ...workflowRun,
  id: 590,
  number: 590,
  repository: 'example/portal',
  attempt: 2,
};
const job: Job = {
  ...buildJob,
  id: 9,
  name: 'Portal / Storefront',
  run_id: 590,
  run_number: 590,
  run_attempt: 2,
};
const runner = { key: 'local-1', githubId: 42, localId: 1, name: 'build-mac-1' };
const list: Page = { key: 0, type: 'list' };
const runnerPage: Page = { key: 1, type: 'runner', runner };
const runPage: Page = { key: 2, type: 'run', run };
const runnerRun: Page = { ...runPage, runner };
const jobPage: Page = { ...runPage, selectedJobId: 9, selectedJobName: job.name };
const stepPage: Page = { ...jobPage, selectedStepNumber: 5, selectedStepName: 'Install' };
const history: Page = { key: 3, type: 'history', job, repository: run.repository };

/** Serializes, parses, and compares what each page is, ignoring loaded names and keys. */
function roundTrip(pages: Page[], view: 'runners' | 'runs') {
  const location = parseLocation(pageLocation(pages, view));
  return {
    view: location?.view,
    identities: location?.pages.map(pageIdentity),
    last: location?.pages.at(-1),
  };
}

describe('page locations', () => {
  it.each(['runners', 'runs'] as const)('round-trips the %s list', (view) => {
    expect(pageLocation([list], view)).toBe(`#/${view}`);
    expect(roundTrip([list], view)).toMatchObject({ view, identities: ['list'] });
  });

  it("round-trips a runner's Runs with its identity and name", () => {
    expect(pageLocation([list, runnerPage], 'runners')).toBe(
      '#/runners/42?local=1&runnerName=build-mac-1',
    );
    expect(roundTrip([list, runnerPage], 'runners')).toEqual({
      view: 'runners',
      identities: ['list', 'runner:42:1'],
      last: { type: 'runner', runner },
    });
  });

  it('round-trips runner diagnostics', () => {
    const logs: Page = { key: 1, type: 'diagnostics', runner };
    expect(roundTrip([list, logs], 'runners')).toEqual({
      view: 'runners',
      identities: ['list', 'diagnostics:1'],
      last: { type: 'diagnostics', runner: { ...runner, githubId: undefined } },
    });
  });

  it('round-trips a Run with its attempt and runner context', () => {
    expect(pageLocation([list, runPage], 'runs')).toBe('#/runs/example/portal/590?attempt=2');
    expect(roundTrip([list, runPage], 'runs')).toMatchObject({
      view: 'runs',
      identities: ['list', 'run:example/portal:590:2:'],
    });
    // A Run keeps the list view it was opened from.
    expect(roundTrip([list, runPage], 'runners').view).toBe('runners');
    expect(roundTrip([list, runnerPage, runnerRun], 'runners')).toMatchObject({
      view: 'runners',
      identities: ['list', 'runner:42:1', 'run:example/portal:590:2:42'],
    });
  });

  it('round-trips a selected Job and Step', () => {
    expect(pageLocation([list, stepPage], 'runs')).toBe(
      '#/runs/example/portal/590/jobs/9?attempt=2&step=5',
    );
    expect(roundTrip([list, jobPage], 'runs').last).toMatchObject({
      type: 'run',
      selectedJobId: 9,
      selectedStepNumber: undefined,
    });
    expect(roundTrip([list, stepPage], 'runs').last).toMatchObject({
      type: 'run',
      run: { id: 590, repository: 'example/portal', attempt: 2 },
      selectedJobId: 9,
      selectedStepNumber: 5,
    });
  });

  it('round-trips Job History beneath its Run and selected Job', () => {
    const { identities, last } = roundTrip([list, jobPage, history], 'runs');
    expect(identities).toEqual(['list', 'run:example/portal:590:2:', 'history:example/portal:9']);
    expect(last).toMatchObject({
      type: 'history',
      repository: 'example/portal',
      job: { id: 9, name: 'Portal / Storefront', workflow_id: 7, run_id: 590 },
    });
    expect(parseLocation(pageLocation([list, jobPage, history], 'runs'))?.pages[1]).toMatchObject({
      selectedJobId: 9,
    });
  });

  it('encodes names that need escaping', () => {
    const named = { ...job, name: 'Test / a&b ?' };
    const location = pageLocation([list, jobPage, { ...history, job: named }], 'runs');
    expect(parseLocation(location)?.pages.at(-1)).toMatchObject({ job: { name: named.name } });
  });

  it.each([
    '',
    '#',
    '#/',
    '#/unknown',
    '#/runs/example',
    '#/runs/example/portal/abc',
    '#/runs/example/portal/590/jobs',
    '#/runs/example/portal/590/steps/1',
    '#/runners/0',
    '#/runners/local/x/logs',
    '#/runs/%E0%A4%A',
  ])('rejects %j', (hash) => {
    expect(parseLocation(hash)).toBeNull();
  });
});

describe('mergeLocation', () => {
  it('keeps shared pages and their keys when moving back or changing selection', () => {
    const current = [list, runnerPage, runnerRun];
    const back = parseLocation('#/runners/42?local=1');
    expect(mergeLocation(current, back?.pages ?? [], 2)).toEqual({
      pages: [list, runnerPage],
      nextKey: 2,
    });
    const job = parseLocation(
      pageLocation([list, runnerPage, { ...runnerRun, selectedJobId: 9 }], 'runners'),
    );
    const merged = mergeLocation(current, job?.pages ?? [], 2);
    expect(merged.pages[2]).toMatchObject({ key: 2, run, selectedJobId: 9 });
  });

  it('returns the same stack when the URL already describes it', () => {
    const current = [list, jobPage];
    const location = parseLocation(pageLocation(current, 'runs'));
    expect(mergeLocation(current, location?.pages ?? [], 2).pages).toBe(current);
  });

  it('adds new pages with fresh keys', () => {
    const location = parseLocation('#/runs/example/portal/590?attempt=2');
    expect(mergeLocation([list], location?.pages ?? [], 4).pages[1]).toMatchObject({
      key: 5,
      type: 'run',
    });
  });
});
