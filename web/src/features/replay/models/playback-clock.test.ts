import { describe, expect, it } from 'vitest';

import type { Job } from '../../../shared/api/types';
import {
  createPlaybackClock,
  type PlaybackClock,
  playbackLabel,
  updatePlaybackClock,
} from './playback-clock';
import { replayLogTime, replaySelectedJob } from './recording-playback';

const bounds = { start: 1_000, end: 11_000 };

function clock(overrides: Partial<PlaybackClock> = {}): PlaybackClock {
  return { ...createPlaybackClock(bounds), ...overrides };
}

describe('playback clock', () => {
  it('starts paused at the beginning at normal speed', () => {
    expect(createPlaybackClock(bounds)).toEqual({ ...bounds, at: 1_000, playing: false, speed: 1 });
    expect(playbackLabel(clock())).toBe('Play');
  });

  it('advances by elapsed time at the chosen speed and stops at the end', () => {
    const playing = clock({ playing: true, speed: 4 });
    expect(updatePlaybackClock(playing, { type: 'tick', elapsed: 1_000 })).toMatchObject({
      at: 5_000,
      playing: true,
    });
    const ended = updatePlaybackClock(playing, { type: 'tick', elapsed: 5_000 });
    expect(ended).toMatchObject({ at: 11_000, playing: false });
    expect(playbackLabel(ended)).toBe('Replay');
  });

  it('ignores ticks while paused', () => {
    const paused = clock({ at: 3_000 });
    expect(updatePlaybackClock(paused, { type: 'tick', elapsed: 1_000 })).toBe(paused);
  });

  it('pauses, resumes, and replays from the start once ended', () => {
    expect(updatePlaybackClock(clock({ playing: true }), { type: 'toggle' }).playing).toBe(false);
    expect(updatePlaybackClock(clock({ at: 4_000 }), { type: 'toggle' })).toMatchObject({
      at: 4_000,
      playing: true,
    });
    expect(updatePlaybackClock(clock({ at: 11_000 }), { type: 'toggle' })).toMatchObject({
      at: 1_000,
      playing: true,
    });
  });

  it('clamps seeks to the recording and stops when seeking to the end while playing', () => {
    expect(updatePlaybackClock(clock(), { type: 'seek-by', offset: -1_000 }).at).toBe(1_000);
    expect(updatePlaybackClock(clock({ at: 10_500 }), { type: 'seek-by', offset: 1_000 }).at).toBe(
      11_000,
    );
    expect(
      updatePlaybackClock(clock({ playing: true }), { type: 'seek', at: 11_000 }),
    ).toMatchObject({ at: 11_000, playing: false });
    expect(
      updatePlaybackClock(clock({ playing: true }), { type: 'seek', at: 6_000 }),
    ).toMatchObject({ at: 6_000, playing: true });
  });

  it('changes speed without moving the position', () => {
    expect(updatePlaybackClock(clock({ at: 2_000 }), { type: 'speed', speed: 10 })).toMatchObject({
      at: 2_000,
      speed: 10,
    });
  });
});

describe('replay selection', () => {
  const job = (id: number, status: string): Job => ({
    id,
    name: `Job ${id}`,
    workflow: 'CI',
    run_number: 1,
    run_id: 1,
    status,
    conclusion: null,
    branch: 'main',
    started_at: null,
    completed_at: null,
    url: '',
    steps: [],
  });
  const jobs = [job(1, 'completed'), job(2, 'in_progress'), job(3, 'queued')];

  it('prefers the chosen job, then the running job, then the first job', () => {
    expect(replaySelectedJob(jobs, 3)?.id).toBe(3);
    expect(replaySelectedJob(jobs, null)?.id).toBe(2);
    expect(replaySelectedJob(jobs, 99)?.id).toBe(2);
    expect(replaySelectedJob([jobs[0], jobs[2]], null)?.id).toBe(1);
    expect(replaySelectedJob([], null)).toBeUndefined();
  });

  it('reveals logs by whole seconds and keeps the exact end', () => {
    expect(replayLogTime(5_750, 10_423)).toBe(5_000);
    expect(replayLogTime(10_423, 10_423)).toBe(10_423);
    expect(replayLogTime(12_000, 10_423)).toBe(10_423);
  });
});
