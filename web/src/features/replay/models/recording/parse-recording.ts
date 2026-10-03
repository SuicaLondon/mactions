import { getTime, isAfter, isBefore, isValid, parseISO } from 'date-fns';

import type { JobLogs } from '../../../../shared/api/types';
import type { CIRecording } from '../../types/recording';
import { array, date, integer, invalid, object, text } from './recording-fields';
import { parseJob } from './recording-job';
import { parseLogs } from './recording-logs';

export function parseRecording(input: unknown): CIRecording {
  const data = object(input, 'expected an object');
  if (data.version !== 1) invalid('unsupported format version');
  const repository = text(data.repository, 'repository');
  if (
    !/^[a-z\d][a-z\d-]*\/[a-z\d_.-]+$/i.test(repository) ||
    ['.', '../../..'].includes(repository.split('/')[1])
  )
    invalid('repository must be owner/name');
  const runId = integer(data.run_id, 'run ID');
  const started = date(data.started_at, 'recording start time');
  const finished = date(data.finished_at, 'recording finish time');
  const startAt = getTime(parseISO(started)),
    endAt = getTime(parseISO(finished));
  if (isBefore(endAt, startAt)) invalid('finish time precedes start time');
  let previous = startAt;
  const knownJobs = new Set<number>();
  const knownSteps = new Map<number, Set<number>>();
  const frames = array(data.frames, 'frames').map((inputFrame) => {
    const frame = object(inputFrame, 'frame');
    const at = integer(frame.at, 'frame timestamp', 0);
    if (!isValid(at) || isBefore(at, previous) || isAfter(at, endAt)) {
      invalid('frames must be ordered within the recording period');
    }
    previous = at;
    const jobs = array(frame.jobs, 'frame jobs').map((job) => parseJob(job, runId));
    if (new Set(jobs.map((job) => job.id)).size !== jobs.length)
      invalid('duplicate job IDs in a frame');
    jobs.forEach((job) => {
      knownJobs.add(job.id);
      const steps = knownSteps.get(job.id) ?? new Set<number>();
      job.steps.forEach((step) => steps.add(step.number));
      knownSteps.set(job.id, steps);
    });
    return { at, jobs };
  });
  if (!frames.length) invalid('at least one frame is required');
  const logs: Record<string, JobLogs> = {};
  for (const [key, value] of Object.entries(object(data.logs, 'log map'))) {
    if (!/^[1-9]\d*:(all|[1-9]\d*)$/.test(key) || !knownJobs.has(Number(key.split(':')[0])))
      invalid('log key must identify a recorded job and step');
    const [jobId, stepNumber] = key.split(':');
    if (stepNumber !== 'all' && !knownSteps.get(Number(jobId))?.has(Number(stepNumber)))
      invalid('log key must identify a recorded step');
    logs[key] = parseLogs(value);
  }
  return {
    version: 1,
    repository,
    run_id: runId,
    started_at: started,
    finished_at: finished,
    frames,
    logs,
  };
}
