import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import type { Job } from '../../web/src/shared/api/types.ts';

const exec = promisify(execFile);

interface RemoteRun {
  id: number;
  run_attempt: number;
  run_number: number;
  name: string;
  status: string;
  conclusion: string | null;
  head_branch: string;
  head_sha: string;
  head_commit: { message: string } | null;
  event: string;
  actor: { login: string };
  triggering_actor?: { login: string };
  display_title?: string;
  path: string;
  workflow_id: number;
}

type RemoteJob = Job & { runner_id: number | null };

async function gh<T>(...args: string[]): Promise<T> {
  const { stdout } = await exec('gh', args, {
    maxBuffer: 16 * 1024 * 1024,
    timeout: 45_000,
  });
  if (stdout.trim()) return JSON.parse(stdout) as T;
  return null as T;
}

export function readRun(repository: string, runId: number): Promise<RemoteRun> {
  return gh('api', `/repos/${repository}/actions/runs/${runId}`);
}

export async function rerunWorkflow(repository: string, runId: number): Promise<void> {
  await gh('run', 'rerun', String(runId), '--repo', repository);
}

export async function readRunnerJobs(
  repository: string,
  run: RemoteRun,
  githubRunnerId: number,
): Promise<Job[]> {
  const response = await gh<{ jobs: RemoteJob[]; total_count: number }>(
    'api',
    `/repos/${repository}/actions/runs/${run.id}/attempts/${run.run_attempt}/jobs?per_page=100`,
  );
  if (response.total_count > response.jobs.length)
    throw new Error('This recording exceeds 100 jobs; refusing to save an incomplete run.');
  return response.jobs
    .filter((job) => job.runner_id === githubRunnerId)
    .map((job) => ({
      id: job.id,
      name: job.name,
      status: job.status,
      conclusion: job.conclusion,
      started_at: job.started_at,
      completed_at: job.completed_at,
      created_at: job.created_at,
      steps: job.steps ?? [],
      workflow: run.name,
      branch: run.head_branch,
      run_id: run.id,
      run_number: run.run_number,
      run_attempt: run.run_attempt,
      run_url: `https://github.com/${repository}/actions/runs/${run.id}`,
      event: run.event,
      actor: run.actor?.login,
      triggering_actor: run.triggering_actor?.login,
      run_title: run.display_title,
      head_sha: run.head_sha,
      commit_message: run.head_commit?.message,
      workflow_path: run.path,
      workflow_url: `https://github.com/${repository}/actions/workflows/${run.workflow_id}`,
      runner_name: job.runner_name,
      runner_group_name: job.runner_group_name,
      labels: job.labels ?? [],
      url: `https://github.com/${repository}/actions/runs/${run.id}/job/${job.id}`,
    }));
}
