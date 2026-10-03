import { mkdir, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import type { Job, JobLogs, Snapshot } from '../../web/src/shared/api/types.ts';
import {
  addMinutes,
  currentDate,
  formatUtcTimestamp,
  getTime,
  isBefore,
} from '../../web/src/shared/lib/date.ts';
import { readRun, readRunnerJobs, rerunWorkflow } from './github.ts';

interface CaptureOptions {
  repository: string;
  runId: number;
  runnerId: number;
  outputPath: string;
  rerun: boolean;
}

interface CIRecording {
  version: 1;
  repository: string;
  run_id: number;
  started_at: string;
  finished_at: string;
  frames: { at: number; jobs: Job[] }[];
  logs: Record<string, JobLogs>;
}

async function local<T>(path: string): Promise<T> {
  const response = await fetch(`http://127.0.0.1:8787${path}`, {
    signal: AbortSignal.timeout(180_000),
  });
  const value = await response.json();
  if (!response.ok) {
    let message = 'Local manager request failed';
    if (value && typeof value === 'object' && 'error' in value) message = String(value.error);
    throw new Error(message);
  }
  return value as T;
}

export async function recordCi({
  repository,
  runId,
  runnerId,
  outputPath,
  rerun,
}: CaptureOptions): Promise<void> {
  const target = (await local<Snapshot>('/api/runners')).runners.find(
    (runner) => runner.id === runnerId,
  );
  if (!target?.github_id || target.deregistered)
    throw new Error('Choose a registered local runner.');
  let expectedTarget = repository.toLowerCase();
  if (target.target.kind !== 'repo') expectedTarget = repository.split('/')[0].toLowerCase();
  if (target.target.name.toLowerCase() !== expectedTarget)
    throw new Error('Repository does not belong to this runner.');

  let run = await readRun(repository, runId);
  const previousAttempt = run.run_attempt;
  const recording: CIRecording = {
    version: 1,
    repository,
    run_id: runId,
    started_at: formatUtcTimestamp(currentDate()),
    finished_at: formatUtcTimestamp(currentDate()),
    frames: [],
    logs: {},
  };
  const output = resolve(outputPath);
  await mkdir(dirname(output), { recursive: true });
  const save = async () => {
    await writeFile(`${output}.partial`, JSON.stringify(recording, null, 2) + '\n', {
      mode: 0o600,
    });
    await rename(`${output}.partial`, output);
  };

  if (rerun) {
    await rerunWorkflow(repository, runId);
    console.log(`Rerun requested: https://github.com/${repository}/actions/runs/${runId}`);
  }
  const deadline = addMinutes(currentDate(), 20);
  let completed = false;
  while (isBefore(currentDate(), deadline)) {
    run = await readRun(repository, runId);
    if (rerun && run.run_attempt <= previousAttempt) {
      await delay(2000);
      continue;
    }
    const jobs = await readRunnerJobs(repository, run, target.github_id);
    recording.frames.push({ at: getTime(currentDate()), jobs });
    recording.finished_at = formatUtcTimestamp(currentDate());
    await save();
    console.log(
      `${formatUtcTimestamp(currentDate())} ${run.status} · ${jobs.map((job) => `${job.name}: ${job.status} (${job.steps.filter((step) => step.status === 'completed').length}/${job.steps.length} steps)`).join(', ') || 'Waiting for runner assignment'}`,
    );
    if (run.status === 'completed') {
      completed = true;
      break;
    }
    await delay(3000);
  }
  if (!completed) throw new Error(`Capture timed out. Partial recording saved to ${output}.`);
  const finalJobs = recording.frames.at(-1)?.jobs;
  if (!finalJobs?.length)
    throw new Error(`No jobs were assigned to this runner. Snapshots saved to ${output}.`);
  for (const job of finalJobs) {
    const scopes = [
      'all',
      ...job.steps
        .filter((step) => step.status === 'completed' && step.conclusion !== 'skipped')
        .map((step) => String(step.number)),
    ];
    for (const scope of scopes) {
      let path = `/api/runners/${runnerId}/job-logs?repository=${encodeURIComponent(repository)}&job_id=${job.id}`;
      let label = 'full log';
      if (scope !== 'all') {
        path += `&step_number=${scope}`;
        label = `step ${scope}`;
      }
      recording.logs[`${job.id}:${scope}`] = await local<JobLogs>(path);
      await save();
      console.log(`Saved job ${job.id} ${label} (${recording.logs[`${job.id}:${scope}`].state})`);
    }
  }
  console.log(`Recording saved: ${output}`);
}
