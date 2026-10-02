import { execFile } from 'node:child_process';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { promisify } from 'node:util';
import type { Job, JobLogs, Snapshot } from '../web/src/types.ts';

const exec = promisify(execFile);
const [repository, runText, runnerText, outputPath, rerun] = process.argv.slice(2);
const runId = Number(runText), runnerId = Number(runnerText);
if (!repository || !/^[\w.-]+\/[\w.-]+$/.test(repository) || !Number.isSafeInteger(runId) || runId < 1 || !Number.isSafeInteger(runnerId) || runnerId < 1 || !outputPath || (rerun && rerun !== '--rerun')) {
  throw new Error('Usage: record-ci.ts OWNER/REPO RUN_ID LOCAL_RUNNER_ID OUTPUT.json [--rerun]');
}
interface RemoteRun {
  id: number; run_attempt: number; run_number: number; name: string; status: string; conclusion: string | null;
  head_branch: string; head_sha: string; head_commit: { message: string } | null;
  event: string; actor: { login: string }; triggering_actor?: { login: string }; display_title?: string; path: string; workflow_id: number;
}
type RemoteJob = Job & { runner_id: number | null };
async function gh<T>(...args: string[]): Promise<T> {
  const { stdout } = await exec('gh', args, { maxBuffer: 16 * 1024 * 1024, timeout: 45_000 });
  return (stdout.trim() ? JSON.parse(stdout) : null) as T;
}
async function local<T>(path: string): Promise<T> {
  const response = await fetch(`http://127.0.0.1:8787${path}`, { signal: AbortSignal.timeout(180_000) });
  const value = await response.json();
  if (!response.ok) throw new Error(value && typeof value === 'object' && 'error' in value ? String(value.error) : 'Local manager request failed');
  return value as T;
}
const target = (await local<Snapshot>('/api/runners')).runners.find(runner => runner.id === runnerId);
if (!target?.github_id || target.deregistered) throw new Error('Choose a registered local runner.');
if (target.target.kind === 'repo' ? target.target.name.toLowerCase() !== repository.toLowerCase() : target.target.name.toLowerCase() !== repository.split('/')[0].toLowerCase()) throw new Error('Repository does not belong to this runner.');
let run = await gh<RemoteRun>('api', `/repos/${repository}/actions/runs/${runId}`);
const previousAttempt = run.run_attempt;
const recording = { version: 1, repository, run_id: runId, started_at: new Date().toISOString(), finished_at: new Date().toISOString(), frames: [] as {at: number; jobs: Job[]}[], logs: {} as Record<string, JobLogs> };
const output = resolve(outputPath);
await mkdir(dirname(output), { recursive: true });
const save = async () => {
  await writeFile(`${output}.partial`, JSON.stringify(recording, null, 2) + '\n', { mode: 0o600 });
  await rename(`${output}.partial`, output);
};
if (rerun) {
  await gh('run', 'rerun', String(runId), '--repo', repository);
  console.log(`Rerun requested: https://github.com/${repository}/actions/runs/${runId}`);
}
const deadline = Date.now() + 20 * 60_000;
let completed = false;
while (Date.now() < deadline) {
  run = await gh<RemoteRun>('api', `/repos/${repository}/actions/runs/${runId}`);
  if (rerun && run.run_attempt <= previousAttempt) { await new Promise(resolve => setTimeout(resolve, 2000)); continue; }
  const response = await gh<{jobs: RemoteJob[]; total_count: number}>('api', `/repos/${repository}/actions/runs/${runId}/attempts/${run.run_attempt}/jobs?per_page=100`);
  if (response.total_count > response.jobs.length) throw new Error('This recording exceeds 100 jobs; refusing to save an incomplete run.');
  const jobs: Job[] = response.jobs.filter(job => job.runner_id === target.github_id).map(job => ({
    id: job.id, name: job.name, status: job.status, conclusion: job.conclusion, started_at: job.started_at,
    completed_at: job.completed_at, created_at: job.created_at, steps: job.steps ?? [], workflow: run.name,
    branch: run.head_branch, run_id: run.id, run_number: run.run_number, run_attempt: run.run_attempt,
    run_url: `https://github.com/${repository}/actions/runs/${run.id}`, event: run.event, actor: run.actor?.login, triggering_actor: run.triggering_actor?.login, run_title: run.display_title,
    head_sha: run.head_sha, commit_message: run.head_commit?.message, workflow_path: run.path,
    workflow_url: `https://github.com/${repository}/actions/workflows/${run.workflow_id}`,
    runner_name: job.runner_name, runner_group_name: job.runner_group_name, labels: job.labels ?? [],
    url: `https://github.com/${repository}/actions/runs/${run.id}/job/${job.id}`,
  }));
  recording.frames.push({ at: Date.now(), jobs });
  recording.finished_at = new Date().toISOString();
  await save();
  console.log(`${new Date().toISOString()} ${run.status} · ${jobs.map(job => `${job.name}: ${job.status} (${job.steps.filter(step => step.status === 'completed').length}/${job.steps.length} steps)`).join(', ') || 'Waiting for runner assignment'}`);
  if (run.status === 'completed') { completed = true; break; }
  await new Promise(resolve => setTimeout(resolve, 3000));
}
if (!completed) throw new Error(`Capture timed out. Partial recording saved to ${output}.`);
const finalJobs = recording.frames.at(-1)!.jobs;
if (!finalJobs.length) throw new Error(`No jobs were assigned to this runner. Snapshots saved to ${output}.`);
for (const job of finalJobs) {
  const scopes = ['all', ...job.steps.filter(step => step.status === 'completed' && step.conclusion !== 'skipped').map(step => String(step.number))];
  for (const scope of scopes) {
    const path = `/api/runners/${runnerId}/job-logs?repository=${encodeURIComponent(repository)}&job_id=${job.id}${scope === 'all' ? '' : `&step_number=${scope}`}`;
    recording.logs[`${job.id}:${scope}`] = await local<JobLogs>(path);
    await save();
    console.log(`Saved job ${job.id} ${scope === 'all' ? 'full log' : `step ${scope}`} (${recording.logs[`${job.id}:${scope}`].state})`);
  }
}
console.log(`Recording saved: ${output}`);
