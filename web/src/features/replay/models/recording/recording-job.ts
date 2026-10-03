import type { Job, JobStep } from '../../../../shared/api/types';
import {
  array,
  githubURL,
  integer,
  invalid,
  nullableText,
  object,
  optionalDate,
  optionalGithubURL,
  optionalInteger,
  text,
} from './recording-fields';

function parseStep(input: unknown): JobStep {
  const step = object(input, 'step');
  return {
    number: integer(step.number, 'step number'),
    name: text(step.name, 'step name'),
    status: text(step.status, 'step status'),
    conclusion: nullableText(step.conclusion, 'step conclusion'),
    started_at: optionalDate(step.started_at, 'step start time'),
    completed_at: optionalDate(step.completed_at, 'step completion time'),
  };
}

export function parseJob(input: unknown, runId: number): Job {
  const job = object(input, 'job');
  const steps = array(job.steps, 'job steps').map(parseStep);
  if (new Set(steps.map((step) => step.number)).size !== steps.length)
    invalid('duplicate step numbers');
  let parsedRunId: number | null = null;
  if (job.run_id != null) {
    if (integer(job.run_id, 'job run ID') !== runId) invalid('job belongs to another run');
    parsedRunId = runId;
  }
  return {
    id: integer(job.id, 'job ID'),
    name: text(job.name, 'job name'),
    status: text(job.status, 'job status'),
    conclusion: nullableText(job.conclusion, 'job conclusion'),
    workflow: text(job.workflow, 'workflow name'),
    branch: text(job.branch, 'branch'),
    run_number: integer(job.run_number, 'run number', 0),
    started_at: optionalDate(job.started_at, 'job start time'),
    completed_at: optionalDate(job.completed_at, 'job completion time'),
    created_at: optionalDate(job.created_at, 'job creation time'),
    url: githubURL(job.url, 'job URL'),
    steps,
    run_id: parsedRunId,
    run_attempt: optionalInteger(job.run_attempt, 'run attempt'),
    run_url: optionalGithubURL(job.run_url, 'run URL'),
    workflow_url: optionalGithubURL(job.workflow_url, 'workflow URL'),
    workflow_path: nullableText(job.workflow_path, 'workflow path'),
    event: nullableText(job.event, 'event'),
    actor: nullableText(job.actor, 'actor'),
    triggering_actor: nullableText(job.triggering_actor, 'triggering actor'),
    run_title: nullableText(job.run_title, 'run title'),
    head_sha: nullableText(job.head_sha, 'commit SHA'),
    commit_message: nullableText(job.commit_message, 'commit message'),
    runner_name: nullableText(job.runner_name, 'runner name'),
    runner_group_name: nullableText(job.runner_group_name, 'runner group'),
    labels: array(job.labels ?? [], 'runner labels').map((label) => text(label, 'runner label')),
  };
}
