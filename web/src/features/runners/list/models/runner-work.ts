import type { JobSummary, WorkflowRun } from '../../../actions/data/types/activity-types';

export interface AssignedRun {
  run: WorkflowRun;
  jobs: JobSummary[];
}

/** Runs with at least one job on the runner, keeping only that runner's jobs. */
export function assignedRuns(runs: WorkflowRun[], githubId: number | undefined): AssignedRun[] {
  if (!githubId) return [];
  const assigned: AssignedRun[] = [];
  for (const run of runs) {
    const jobs = run.jobs?.filter((job) => job.runner_id === githubId) ?? [];
    if (jobs.length) assigned.push({ run, jobs });
  }
  return assigned;
}

export interface NoWorkInput {
  connected: boolean;
  unavailable: boolean;
  githubId: number | undefined;
  busy: boolean | null;
}

/** Why a runner shows no assigned work. */
export function noWorkMessage({ connected, unavailable, githubId, busy }: NoWorkInput) {
  if (!connected) return 'GitHub disconnected';
  if (unavailable) return 'Work unavailable';
  if (!githubId) return 'Runner identity unavailable';
  if (busy === false) return 'No active jobs';
  return 'No jobs reported';
}
