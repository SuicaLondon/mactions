import { addMilliseconds, getTime, parseISO } from 'date-fns';
import { describe, expect, it } from 'vitest';

import type { Job, JobLogs } from '../../../shared/api/types';
import { formatUtcTimestamp } from '../../../shared/lib/date';
import { parseRecording } from '../models/recording/parse-recording';
import {
  logContentAt,
  replayFrameAt,
  replayLogsForJob,
} from '../models/recording/recording-playback';
import type { CIRecording } from '../types/recording';

const start = getTime(parseISO('2026-09-30T10:00:00Z'));
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
      at: getTime(addMilliseconds(start, 10_000)),
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

describe('recording import', () => {
  it('validates and preserves a recorded run', () => {
    const result = parseRecording(
      JSON.parse(
        JSON.stringify({
          ...recording,
          logs: { ...recording.logs, '10:1': { ...savedLogs, scope: 'job' } },
        }),
      ),
    );
    expect(result.frames[0].jobs[0].run_attempt).toBe(2);
    expect(result.frames[0].jobs[0].triggering_actor).toBe('octocat');
    expect(result.frames[0].jobs[0].run_title).toBe('Build the application');
    expect(result.logs['10:all'].content).toBe(savedLogs.content);
    expect(result.logs['10:1'].scope).toBe('job');
    expect(result.frames[1].at).toBe(getTime(addMilliseconds(start, 10_000)));
  });

  it.each([
    'javascript:alert(1)',
    'https://github.com.evil.example/repo',
    'http://github.com/example/build',
    'https://user:password@github.com/example/build',
  ])('rejects unsafe imported links: %s', (url) => {
    expect(() =>
      parseRecording({ ...recording, frames: [{ at: start, jobs: [{ ...job, url }] }] }),
    ).toThrow('HTTPS GitHub link');
  });

  it('checks optional links, frame chronology, IDs, and nested log data', () => {
    expect(() =>
      parseRecording({
        ...recording,
        frames: [{ at: start, jobs: [{ ...job, workflow_url: 'data:text/html,invalid' }] }],
      }),
    ).toThrow('HTTPS GitHub link');
    expect(() => parseRecording({ ...recording, frames: [...recording.frames].reverse() })).toThrow(
      'ordered',
    );
    expect(() => parseRecording({ ...recording, frames: [] })).toThrow('at least one frame');
    expect(() => parseRecording({ ...recording, frames: [{ at: Infinity, jobs: [job] }] })).toThrow(
      'timestamp',
    );
    expect(() =>
      parseRecording({ ...recording, frames: [{ at: start, jobs: [{ ...job, run_id: 901 }] }] }),
    ).toThrow('another run');
    expect(() =>
      parseRecording({ ...recording, logs: { '10:all': { ...savedLogs, content: {} } } }),
    ).toThrow('log content');
    expect(() =>
      parseRecording({ ...recording, logs: { '10:all': { ...savedLogs, state: ['available'] } } }),
    ).toThrow('log state');
    expect(() =>
      parseRecording({ ...recording, logs: { '10:all': { ...savedLogs, scope: 'unknown' } } }),
    ).toThrow('log scope');
    expect(() => parseRecording({ ...recording, logs: { '20:all': savedLogs } })).toThrow(
      'recorded job',
    );
    expect(() => parseRecording({ ...recording, logs: { '10:99': savedLogs } })).toThrow(
      'recorded step',
    );
  });

  it('rejects invalid dates and preserves precise inclusive recording boundaries', () => {
    expect(() => parseRecording({ ...recording, started_at: 'invalid' })).toThrow(
      'recording start time',
    );
    expect(() => parseRecording({ ...recording, finished_at: '2026-09-30T09:59:59.999Z' })).toThrow(
      'finish time precedes start time',
    );
    expect(() =>
      parseRecording({
        ...recording,
        frames: [{ at: start, jobs: [{ ...job, completed_at: 'invalid' }] }],
      }),
    ).toThrow('job completion time');
    const precise = {
      ...recording,
      finished_at: '2026-09-30T10:00:00.423Z',
      frames: [
        { at: start, jobs: [job] },
        { at: getTime(addMilliseconds(start, 423)), jobs: [job] },
      ],
    };
    expect(parseRecording(precise).frames[1].at).toBe(getTime(addMilliseconds(start, 423)));
    expect(() =>
      parseRecording({
        ...precise,
        frames: [...precise.frames, { at: Number.MAX_SAFE_INTEGER, jobs: [] }],
      }),
    ).toThrow('ordered within the recording period');
  });
});

describe('recording playback', () => {
  it('uses the preceding snapshot between sparse capture times', () => {
    expect(replayFrameAt(recording, getTime(addMilliseconds(start, 9_999))).jobs[0].status).toBe(
      'in_progress',
    );
    expect(replayFrameAt(recording, getTime(addMilliseconds(start, 10_000))).jobs[0].status).toBe(
      'completed',
    );
  });

  it('withholds future lines and their untimed continuations', () => {
    const content =
      'Header\n2026-09-30T10:00:02.1234567Z first\nfirst continuation\n2026-09-30T10:00:09Z future\nfuture continuation';
    expect(logContentAt(content, getTime(addMilliseconds(start, 5_000)), false)).toBe(
      '2026-09-30T10:00:02.1234567Z first\nfirst continuation',
    );
    expect(logContentAt(content, getTime(addMilliseconds(start, 5_000)), true)).not.toContain(
      'future',
    );
    expect(logContentAt(content, getTime(addMilliseconds(start, 10_000)), true)).toBe(content);
    expect(logContentAt('Untimed output', getTime(addMilliseconds(start, 5_000)), false)).toBe('');
    expect(logContentAt('Untimed output', getTime(addMilliseconds(start, 10_000)), true)).toBe(
      'Untimed output',
    );
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
    const early = replayLogsForJob(source, active, getTime(addMilliseconds(start, 5_000)));
    expect(early.all.content).toBe('2026-09-30T10:00:02Z compiling');
    expect(early['1'].state).toBe('pending');
    expect(early['1'].content).toBe('');
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
    expect(
      replayLogsForJob(source, completed, getTime(addMilliseconds(start, 9_000)))['1'].content,
    ).toBe('Untimed compiler output');
  });
});
