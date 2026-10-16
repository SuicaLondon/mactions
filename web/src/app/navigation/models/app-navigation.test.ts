import { describe, expect, it } from 'vitest';

import { workflowRun } from '../../../test/app-harness';
import { backDestination, currentPageHeading, type Page, pageTransition } from './app-navigation';

const list: Page = { key: 0, type: 'list' };
const runner = { key: 'r', name: 'build-mac-1' };
const detail: Page = { key: 1, type: 'diagnostics', runner };
const logs: Page = { key: 2, type: 'runner', runner };

describe('pageTransition', () => {
  it('ignores updates to the current page', () => {
    expect(pageTransition([list, detail], [list, { ...detail }])).toEqual({ type: 'none' });
  });

  it('saves the page being left when history moves forward', () => {
    expect(pageTransition([list], [list, detail])).toEqual({ type: 'forward', from: list });
  });

  it('restores the destination and discards later pages when moving back', () => {
    expect(pageTransition([list, detail, logs], [list])).toEqual({
      type: 'back',
      to: list,
      discarded: [detail, logs],
    });
  });

  it('starts over when the list itself changes', () => {
    expect(pageTransition([list, detail], [{ key: 3, type: 'list' }])).toEqual({ type: 'reset' });
  });
});

const runPage: Page = { key: 3, type: 'run', run: workflowRun };
const jobPage: Page = { ...runPage, selectedJobId: 9, selectedJobName: 'Portal / Storefront' };
const stepPage: Page = { ...jobPage, selectedStepNumber: 2, selectedStepName: 'Install deps' };

describe('backDestination', () => {
  it('returns from a selected Step to its Job and from a Job to its Run', () => {
    expect(backDestination([list, stepPage], 'runs')).toEqual({
      type: 'job',
      label: 'Portal / Storefront',
      jobId: 9,
    });
    expect(backDestination([list, jobPage], 'runs')).toEqual({ type: 'run', label: 'CI #42' });
  });

  it('names the previous page from a Run overview', () => {
    expect(backDestination([list, runPage], 'runs')).toEqual({ type: 'page', label: 'Runs' });
  });
});

describe('currentPageHeading', () => {
  it('names the deepest selection in full', () => {
    expect(currentPageHeading(runPage, 'runs')).toBe('CI #42');
    expect(currentPageHeading(jobPage, 'runs')).toBe('Portal / Storefront');
    expect(currentPageHeading(stepPage, 'runs')).toBe('Install deps');
    expect(currentPageHeading(detail, 'runs')).toBe('build-mac-1 logs');
  });
});
