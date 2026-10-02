import type { Job, JobLogs, JobStep } from './types';

export interface CIRecording {
  version: 1;
  repository: string;
  run_id: number;
  started_at: string;
  finished_at: string;
  frames: { at: number; jobs: Job[] }[];
  logs: Record<string, JobLogs>;
}

function invalid(field: string): never { throw new Error(`Invalid recording: ${field}.`); }
function object(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid(field);
  return value as Record<string, unknown>;
}
function text(value: unknown, field: string): string {
  return typeof value === 'string' ? value : invalid(field);
}
function integer(value: unknown, field: string, minimum = 1): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum ? value : invalid(field);
}
function array(value: unknown, field: string): unknown[] {
  return Array.isArray(value) ? value : invalid(field);
}
function date(value: unknown, field: string): string {
  const result = text(value, field);
  return Number.isFinite(Date.parse(result)) ? result : invalid(field);
}
function optionalDate(value: unknown, field: string): string | null {
  return value == null ? null : date(value, field);
}
function githubURL(value: unknown, field: string): string {
  const result = text(value, field);
  try {
    const url = new URL(result);
    if (url.protocol === 'https:' && url.hostname === 'github.com' && !url.port && !url.username && !url.password) return url.href;
  } catch { /* Invalid URLs are rejected below. */ }
  return invalid(`${field} must be an HTTPS GitHub link`);
}
function nullableText(value: unknown, field: string): string | null {
  return value == null ? null : text(value, field);
}
function parseStep(input: unknown): JobStep {
  const step = object(input, 'step');
  return {
    number: integer(step.number, 'step number'), name: text(step.name, 'step name'),
    status: text(step.status, 'step status'), conclusion: nullableText(step.conclusion, 'step conclusion'),
    started_at: optionalDate(step.started_at, 'step start time'), completed_at: optionalDate(step.completed_at, 'step completion time'),
  };
}
function parseJob(input: unknown, runId: number): Job {
  const job = object(input, 'job');
  const steps = array(job.steps, 'job steps').map(parseStep);
  if (new Set(steps.map(step => step.number)).size !== steps.length) invalid('duplicate step numbers');
  if (job.run_id != null && integer(job.run_id, 'job run ID') !== runId) invalid('job belongs to another run');
  return {
    id: integer(job.id, 'job ID'), name: text(job.name, 'job name'), status: text(job.status, 'job status'),
    conclusion: nullableText(job.conclusion, 'job conclusion'), workflow: text(job.workflow, 'workflow name'),
    branch: text(job.branch, 'branch'), run_number: integer(job.run_number, 'run number', 0),
    started_at: optionalDate(job.started_at, 'job start time'), completed_at: optionalDate(job.completed_at, 'job completion time'),
    created_at: optionalDate(job.created_at, 'job creation time'), url: githubURL(job.url, 'job URL'), steps,
    run_id: job.run_id == null ? null : runId, run_attempt: job.run_attempt == null ? null : integer(job.run_attempt, 'run attempt'),
    run_url: job.run_url == null ? null : githubURL(job.run_url, 'run URL'),
    workflow_url: job.workflow_url == null ? null : githubURL(job.workflow_url, 'workflow URL'),
    workflow_path: nullableText(job.workflow_path, 'workflow path'), event: nullableText(job.event, 'event'),
    actor: nullableText(job.actor, 'actor'), triggering_actor: nullableText(job.triggering_actor, 'triggering actor'),
    run_title: nullableText(job.run_title, 'run title'), head_sha: nullableText(job.head_sha, 'commit SHA'),
    commit_message: nullableText(job.commit_message, 'commit message'), runner_name: nullableText(job.runner_name, 'runner name'),
    runner_group_name: nullableText(job.runner_group_name, 'runner group'),
    labels: job.labels == null ? [] : array(job.labels, 'runner labels').map(label => text(label, 'runner label')),
  };
}
function parseLogs(input: unknown): JobLogs {
  const logs = object(input, 'logs');
  if (typeof logs.state !== 'string' || !['available', 'pending', 'unavailable'].includes(logs.state)) invalid('log state');
  if (logs.scope != null && logs.scope !== 'job' && logs.scope !== 'step') invalid('log scope');
  const steps = array(logs.steps, 'log steps').map(inputStep => {
    const step = object(inputStep, 'step log');
    return { number: integer(step.number, 'log step number'), name: text(step.name, 'log step name'), content: text(step.content, 'step log content') };
  });
  if (new Set(steps.map(step => step.number)).size !== steps.length) invalid('duplicate log step numbers');
  return {
    state: logs.state as JobLogs['state'], message: text(logs.message, 'log message'), content: text(logs.content, 'log content'), steps,
    ...(logs.scope == null ? {} : { scope: logs.scope as JobLogs['scope'] }),
    ...(logs.unassigned_content == null ? {} : { unassigned_content: text(logs.unassigned_content, 'unassigned log content') }),
  };
}

export function parseRecording(input: unknown): CIRecording {
  const data = object(input, 'expected an object');
  if (data.version !== 1) invalid('unsupported format version');
  const repository = text(data.repository, 'repository');
  if (!/^[a-z\d][a-z\d-]*\/[a-z\d_.-]+$/i.test(repository) || ['.', '..'].includes(repository.split('/')[1])) invalid('repository must be owner/name');
  const runId = integer(data.run_id, 'run ID');
  const started = date(data.started_at, 'recording start time');
  const finished = date(data.finished_at, 'recording finish time');
  const startAt = Date.parse(started), endAt = Date.parse(finished);
  if (endAt < startAt) invalid('finish time precedes start time');
  let previous = startAt;
  const knownJobs = new Set<number>();
  const knownSteps = new Map<number, Set<number>>();
  const frames = array(data.frames, 'frames').map(inputFrame => {
    const frame = object(inputFrame, 'frame');
    const at = integer(frame.at, 'frame timestamp', 0);
    if (at < previous || at > endAt) invalid('frames must be ordered within the recording period');
    previous = at;
    const jobs = array(frame.jobs, 'frame jobs').map(job => parseJob(job, runId));
    if (new Set(jobs.map(job => job.id)).size !== jobs.length) invalid('duplicate job IDs in a frame');
    jobs.forEach(job => {
      knownJobs.add(job.id);
      const steps = knownSteps.get(job.id) ?? new Set<number>();
      job.steps.forEach(step => steps.add(step.number));
      knownSteps.set(job.id, steps);
    });
    return { at, jobs };
  });
  if (!frames.length) invalid('at least one frame is required');
  const logs: Record<string, JobLogs> = {};
  for (const [key, value] of Object.entries(object(data.logs, 'log map'))) {
    if (!/^[1-9]\d*:(all|[1-9]\d*)$/.test(key) || !knownJobs.has(Number(key.split(':')[0]))) invalid('log key must identify a recorded job and step');
    const [jobId, stepNumber] = key.split(':');
    if (stepNumber !== 'all' && !knownSteps.get(Number(jobId))?.has(Number(stepNumber))) invalid('log key must identify a recorded step');
    logs[key] = parseLogs(value);
  }
  return { version: 1, repository, run_id: runId, started_at: started, finished_at: finished, frames, logs };
}

export function replayFrameAt(recording: CIRecording, at: number): CIRecording['frames'][number] {
  let index = 0;
  for (let next = 1; next < recording.frames.length && recording.frames[next].at <= at; next++) index = next;
  return recording.frames[index];
}

function completedAt(item: Job | JobStep, at: number) {
  return item.status === 'completed' && (!item.completed_at || Date.parse(item.completed_at) <= at);
}

// Continuation lines inherit the preceding timestamp. Untimed output is only
// revealed after the corresponding job or step has completed in the recording.
export function logContentAt(content: string, at: number, completed: boolean): string {
  let timestamp: number | null = null;
  return content.split('\n').filter(line => {
    const match = line.match(/^(?:\u001b\[[\d;]*m)*(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))(?:\s|$)/);
    if (match) timestamp = Date.parse(match[1]);
    return timestamp == null ? completed : Number.isFinite(timestamp) && timestamp <= at;
  }).join('\n');
}

export function replayLogsForJob(recording: CIRecording, job: Job, at: number): Record<string, JobLogs> {
  const scoped: Record<string, JobLogs> = {};
  const all = recording.logs[`${job.id}:all`];
  for (const step of [undefined, ...job.steps]) {
    const key = step?.number ?? 'all';
    const capturedStep = step && all?.steps.find(item => item.number === step.number);
    const saved = recording.logs[`${job.id}:${key}`] ?? (capturedStep && all ? { ...all, scope: 'step' as const, content: capturedStep.content, steps: [capturedStep], unassigned_content: undefined } : undefined);
    if (!saved) {
      scoped[key] = { state: completedAt(step ?? job, at) ? 'unavailable' : 'pending', message: 'No output was captured for this part of the run.', content: '', steps: [] };
      continue;
    }
    if (saved.state !== 'available') { scoped[key] = saved; continue; }
    const completed = completedAt(step ?? job, at);
    const content = logContentAt(saved.content, at, completed);
    scoped[key] = {
      ...saved, state: content || completed ? 'available' : 'pending',
      message: completed ? saved.message : content ? 'Recorded output up to this point in the run.' : 'No recorded output at this point in the run.', content,
      steps: saved.steps.map(item => ({ ...item, content: logContentAt(item.content, at, completedAt(job.steps.find(candidate => candidate.number === item.number) ?? job, at)) })),
      ...(saved.unassigned_content == null ? {} : { unassigned_content: logContentAt(saved.unassigned_content, at, completedAt(job, at)) }),
    };
  }
  return scoped;
}
