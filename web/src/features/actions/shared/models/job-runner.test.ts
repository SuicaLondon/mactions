import { expect, it } from 'vitest';

import { ranOnRunner } from './job-runner';

it('matches a job to the runner it ran on', () => {
  expect(ranOnRunner({ runner_id: 11 }, 11)).toBe(true);
  expect(ranOnRunner({ runner_id: 12 }, 11)).toBe(false);
  expect(ranOnRunner({ runner_id: null }, 11)).toBe(false);
});

it('matches nothing without a runner, including jobs without a reported runner', () => {
  expect(ranOnRunner({ runner_id: 11 }, undefined)).toBe(false);
  expect(ranOnRunner({}, undefined)).toBe(false);
});
