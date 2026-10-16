import { addMilliseconds, clamp, compareAsc, getTime, parseISO } from 'date-fns';

import type { CIRecording } from '../types/recording';

export interface PlaybackBounds {
  start: number;
  end: number;
}

export interface PlaybackClock extends PlaybackBounds {
  at: number;
  playing: boolean;
  speed: number;
}

export type PlaybackAction =
  | { type: 'toggle' }
  | { type: 'tick'; elapsed: number }
  | { type: 'seek'; at: number }
  | { type: 'seek-by'; offset: number }
  | { type: 'speed'; speed: number };

export function playbackBounds(recording: CIRecording): PlaybackBounds {
  return { start: recording.frames[0].at, end: getTime(parseISO(recording.finished_at)) };
}

export function createPlaybackClock(bounds: PlaybackBounds): PlaybackClock {
  return { ...bounds, at: bounds.start, playing: false, speed: 1 };
}

export function isPlaybackEnded({ at, end }: Pick<PlaybackClock, 'at' | 'end'>) {
  return compareAsc(at, end) >= 0;
}

export function playbackLabel(clock: PlaybackClock) {
  if (clock.playing) return 'Pause';
  if (isPlaybackEnded(clock)) return 'Replay';
  return 'Play';
}

function clampToBounds(clock: PlaybackClock, at: number) {
  return getTime(clamp(at, { start: clock.start, end: clock.end }));
}

// Playback stops on reaching the end, whether by playing or by seeking there.
function settle(clock: PlaybackClock): PlaybackClock {
  if (clock.playing && isPlaybackEnded(clock)) return { ...clock, playing: false };
  return clock;
}

export function updatePlaybackClock(clock: PlaybackClock, action: PlaybackAction): PlaybackClock {
  switch (action.type) {
    case 'toggle':
      if (clock.playing) return { ...clock, playing: false };
      if (isPlaybackEnded(clock)) return settle({ ...clock, at: clock.start, playing: true });
      return settle({ ...clock, playing: true });
    case 'tick': {
      if (!clock.playing) return clock;
      const at = clampToBounds(
        clock,
        getTime(addMilliseconds(clock.at, action.elapsed * clock.speed)),
      );
      return settle({ ...clock, at });
    }
    case 'seek':
      return settle({ ...clock, at: clampToBounds(clock, action.at) });
    case 'seek-by':
      return settle({
        ...clock,
        at: clampToBounds(clock, getTime(addMilliseconds(clock.at, action.offset))),
      });
    case 'speed':
      return { ...clock, speed: action.speed };
  }
}
