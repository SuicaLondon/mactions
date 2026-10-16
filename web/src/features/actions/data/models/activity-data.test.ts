import { expect, it } from 'vitest';

import { makeJobSummary, makeRun } from '../../../../test/activity-fixtures';
import {
  friendlyRefreshInterval,
  prepareJobHistory,
  prepareRunList,
  refreshNote,
} from './activity-data';

const run = makeRun({
  id: 1,
  title: 'Original execution',
  status: 'in_progress',
  conclusion: null,
});

const job = makeJobSummary({ id: 11, run_id: 1, status: 'in_progress', conclusion: null });

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

it.each([
  [30, null],
  [90, 'Updates about every 2 min'],
  [128, 'Updates about every 2 min'],
  [120, 'Updates every 2 min'],
])('notes a %i s refresh interval as %j', (seconds, note) => {
  expect(refreshNote(seconds)).toBe(note);
});

it.each([
  [30, 'every 30 s'],
  [43, 'about every 45 s'],
  [59, 'about every 1 min'],
  [60, 'every 1 min'],
  [150, 'about every 3 min'],
])('rounds a %i s refresh interval to %s', (seconds, label) => {
  expect(friendlyRefreshInterval(seconds)).toBe(label);
});
