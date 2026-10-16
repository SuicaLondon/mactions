import type { JobSummary, WorkflowRun } from '../features/actions/data/types/activity-types';
import type { Job } from '../shared/api/types';

/**
 * Small Actions activity fixtures for feature tests. Each factory returns a complete record with
 * neutral defaults; a test overrides only the fields its assertions read.
 */
const runUrl = 'https://github.com/example/app/actions/runs/100';

export function makeRun(overrides: Partial<WorkflowRun> = {}): WorkflowRun {
  return {
    id: 100,
    repository: 'example/app',
    workflow_id: 8,
    name: 'CI',
    title: 'Improve build',
    number: 42,
    attempt: 1,
    status: 'completed',
    conclusion: 'success',
    branch: 'main',
    head_sha: 'abcdef1',
    url: runUrl,
    created_at: null,
    started_at: null,
    updated_at: null,
    ...overrides,
  };
}

export function makeJobSummary(overrides: Partial<JobSummary> = {}): JobSummary {
  const { id = 1, ...fields } = overrides;
  return {
    id,
    name: 'Build',
    workflow: 'CI',
    status: 'completed',
    conclusion: 'success',
    repository: 'example/app',
    workflow_id: 8,
    branch: 'main',
    run_number: 42,
    run_id: 100,
    run_attempt: 1,
    url: `${runUrl}/job/${id}`,
    run_url: runUrl,
    runner_id: null,
    runner_name: null,
    host_type: 'unknown',
    device: 'unknown',
    started_at: null,
    completed_at: null,
    ...fields,
  };
}

export function makeJob(overrides: Partial<Job> = {}): Job {
  const { steps = [], ...fields } = overrides;
  return { ...makeJobSummary({ id: fields.id }), ...fields, steps };
}
