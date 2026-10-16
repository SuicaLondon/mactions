import { addMilliseconds, getTime, parseISO } from 'date-fns';
import { describe, expect, it } from 'vitest';

import type { Job, JobLogs } from '../../../shared/api/types';
import { formatUtcTimestamp } from '../../../shared/lib/date';
import type { CIRecording } from '../types/recording';
import { parseRecording } from './parse-recording';
import { logContentAt, replayFrameAt, replayLogsForJob } from './recording-playback';

const start = getTime(parseISO('2026-09-30T10:00:00Z'));
const at = (milliseconds: number) => getTime(addMilliseconds(start, milliseconds));
const job: Job = {
  id: 10,
  name: 'Build',
  workflow: 'CI',
  run_number: 42,
  run_id: 900,
  run_attempt: 2,
  status: 'in_progress',
  conclusion: null,
  branch: 'main',
  started_at: formatUtcTimestamp(start),
  completed_at: null,
  triggering_actor: 'octocat',
  run_title: 'Build the application',
  url: 'https://github.com/example/build/actions/runs/900/job/10',
  steps: [{ number: 1, name: 'Compile', status: 'in_progress', conclusion: null }],
};
const savedLogs: JobLogs = {
  state: 'available',
  message: '',
  content: '2026-09-30T10:00:02Z compiling\n2026-09-30T10:00:09Z finished',
  steps: [],
};
const recording: CIRecording = {
  version: 1,
  repository: 'example/build',
  run_id: 900,
  started_at: formatUtcTimestamp(start),
  finished_at: formatUtcTimestamp(addMilliseconds(start, 10_000)),
  frames: [
    { at: start, jobs: [job] },
    {
      at: at(10_000),
      jobs: [
        {
          ...job,
          status: 'completed',
          conclusion: 'success',
          completed_at: formatUtcTimestamp(addMilliseconds(start, 10_000)),
        },
      ],
    },
  ],
  logs: { '10:all': savedLogs },
};

const withJob = (overrides: Partial<Job>) => ({
  ...recording,
  frames: [{ at: start, jobs: [{ ...job, ...overrides }] }],
});
const withLogs = (logs: Record<string, unknown>) => ({ ...recording, logs });
const precise = {
  ...recording,
  finished_at: '2026-09-30T10:00:00.423Z',
  frames: [
    { at: start, jobs: [job] },
    { at: at(423), jobs: [job] },
  ],
};

describe('recording import', () => {
  it('validates and preserves a recorded run', () => {
    const result = parseRecording(
      JSON.parse(
        JSON.stringify(withLogs({ ...recording.logs, '10:1': { ...savedLogs, scope: 'job' } })),
      ),
    );
    expect(result.frames[0].jobs[0]).toMatchObject({
      run_attempt: 2,
      triggering_actor: 'octocat',
      run_title: 'Build the application',
    });
    expect(result.logs['10:all'].content).toBe(savedLogs.content);
    expect(result.logs['10:1'].scope).toBe('job');
    expect(parseRecording(precise).frames[1].at).toBe(at(423));
  });

  it.each([
    { url: 'javascript:alert(1)' },
    { url: 'https://github.com.evil.example/repo' },
    { url: 'http://github.com/example/build' },
    { url: 'https://user:password@github.com/example/build' },
    { workflow_url: 'data:text/html,invalid' },
  ])('rejects unsafe link %o', (link) => {
    expect(() => parseRecording(withJob(link))).toThrow('HTTPS GitHub link');
  });

  const log = (patch: object) => withLogs({ '10:all': { ...savedLogs, ...patch } });
  it.each([
    ['ordered', { ...recording, frames: [...recording.frames].reverse() }],
    ['at least one frame', { ...recording, frames: [] }],
    ['timestamp', { ...recording, frames: [{ at: Infinity, jobs: [job] }] }],
    ['another run', withJob({ run_id: 901 })],
    ['log content', log({ content: {} })],
    ['log state', log({ state: ['available'] })],
    ['log scope', log({ scope: 'unknown' })],
    ['recorded job', withLogs({ '20:all': savedLogs })],
    ['recorded step', withLogs({ '10:99': savedLogs })],
    ['recording start time', { ...recording, started_at: 'invalid' }],
    ['finish time precedes start time', { ...recording, finished_at: '2026-09-30T09:59:59.999Z' }],
    ['job completion time', withJob({ completed_at: 'invalid' })],
    [
      'ordered within the recording period',
      { ...precise, frames: [...precise.frames, { at: Number.MAX_SAFE_INTEGER, jobs: [] }] },
    ],
  ])('rejects invalid input with "%s"', (message, input) => {
    expect(() => parseRecording(input)).toThrow(message);
  });
});

describe('recording playback', () => {
  it('uses the preceding snapshot between sparse capture times', () => {
    expect(replayFrameAt(recording, at(9_999)).jobs[0].status).toBe('in_progress');
    expect(replayFrameAt(recording, at(10_000)).jobs[0].status).toBe('completed');
  });

  it('withholds future lines and their untimed continuations', () => {
    const content =
      'Header\n2026-09-30T10:00:02.1234567Z first\nfirst continuation\n2026-09-30T10:00:09Z future\nfuture continuation';
    expect(logContentAt(content, at(5_000), false)).toBe(
      '2026-09-30T10:00:02.1234567Z first\nfirst continuation',
    );
    expect(logContentAt(content, at(5_000), true)).not.toContain('future');
    expect(logContentAt(content, at(10_000), true)).toBe(content);
    expect(logContentAt('Untimed output', at(5_000), false)).toBe('');
    expect(logContentAt('Untimed output', at(10_000), true)).toBe('Untimed output');
  });

  it('slices selected job logs, derives available step output, and retains unavailable states', () => {
    const source: CIRecording = {
      ...recording,
      logs: {
        '10:all': {
          ...savedLogs,
          steps: [{ number: 1, name: 'Compile', content: 'Untimed compiler output' }],
        },
        '10:2': { state: 'unavailable', message: 'Expired on GitHub.', content: '', steps: [] },
        '10:3': { state: 'pending', message: 'Not uploaded yet.', content: '', steps: [] },
      },
    };
    const active: Job = {
      ...job,
      steps: [
        ...job.steps,
        { number: 2, name: 'Test', status: 'completed', conclusion: 'failure' },
        { number: 3, name: 'Upload', status: 'in_progress', conclusion: null },
      ],
    };
    const early = replayLogsForJob(source, active, at(5_000));
    expect(early.all.content).toBe('2026-09-30T10:00:02Z compiling');
    expect(early['1']).toMatchObject({ state: 'pending', content: '' });
    expect(early['2']).toEqual(source.logs['10:2']);
    expect(early['3']).toEqual(source.logs['10:3']);
    const completed: Job = {
      ...active,
      steps: [
        {
          ...job.steps[0],
          status: 'completed',
          completed_at: formatUtcTimestamp(addMilliseconds(start, 8_000)),
        },
      ],
    };
    expect(replayLogsForJob(source, completed, at(9_000))['1'].content).toBe(
      'Untimed compiler output',
    );
  });
});
