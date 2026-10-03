import { expect, it } from 'vitest';

import type { JobSummary, WorkflowRun } from '../types/activity-types';
import { prepareJobHistory, prepareRunList, refreshIntervalLabel } from './activity-data';

const run: WorkflowRun = {
  id: 1,
  repository: 'example/app',
  workflow_id: 8,
  name: 'CI',
  title: 'Original execution',
  number: 42,
  attempt: 1,
  status: 'in_progress',
  conclusion: null,
  branch: 'main',
  head_sha: '',
  url: 'https://github.com/example/app/actions/runs/1',
  created_at: null,
  started_at: null,
  updated_at: null,
};

const job: JobSummary = {
  id: 11,
  name: 'Build',
  workflow: run.name,
  repository: run.repository,
  workflow_id: run.workflow_id,
  status: run.status,
  conclusion: run.conclusion,
  branch: run.branch,
  run_number: run.number,
  run_id: run.id,
  run_attempt: run.attempt,
  url: `${run.url}/job/11`,
  runner_id: null,
  runner_name: null,
  host_type: 'unknown',
  device: 'unknown',
  started_at: null,
  completed_at: null,
};

it('keeps floor-based minute labels for negative durations', () => {
  expect(refreshIntervalLabel(-1)).toBe('-1m 59s');
});

it('keeps the first run before filtering and treats other attempts and repositories separately', () => {
  const duplicate = { ...run, title: 'Needle', status: 'completed', conclusion: 'success' };
  const retry = { ...duplicate, attempt: 2 };
  const otherRepository = { ...duplicate, repository: 'example/other' };
  const pages = [
    { runs: [run], next_page: 2, message: 'Partial results' },
    { runs: [duplicate, retry, otherRepository], next_page: null, message: 'Partial results' },
  ];
  expect(prepareRunList(pages, 'all', 'NEEDLE')).toEqual({
    allRuns: [run, duplicate, retry, otherRepository],
    runs: [retry, otherRepository],
    messages: ['Partial results'],
  });
  expect(prepareRunList(pages, 'success').runs).toEqual([retry, otherRepository]);
});

it('keeps historical loaded counts unfiltered and hides later duplicates before status matching', () => {
  const duplicate = { ...job, status: 'completed', conclusion: 'success' };
  const previous = { ...duplicate, id: 10, run_number: 41 };
  expect(
    prepareJobHistory(
      [
        { jobs: [job], next_page: 2, message: '' },
        { jobs: [duplicate, previous], next_page: null, message: 'Partial results' },
      ],
      'success',
    ),
  ).toEqual({
    allJobs: [job, previous],
    jobs: [previous],
    messages: ['Partial results'],
  });
});
