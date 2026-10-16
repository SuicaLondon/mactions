import { useEffect, useReducer } from 'react';

import {
  createPlaybackClock,
  type PlaybackBounds,
  updatePlaybackClock,
} from '../models/playback-clock';

/** Owns the replay position, play state, and speed, and advances the position while playing. */
export function usePlaybackClock(bounds: PlaybackBounds) {
  const [clock, dispatch] = useReducer(updatePlaybackClock, bounds, createPlaybackClock);
  const { playing } = clock;
  useEffect(() => {
    if (!playing) return;
    let previous = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      dispatch({ type: 'tick', elapsed: now - previous });
      previous = now;
    }, 250);
    return () => window.clearInterval(timer);
  }, [playing]);
  return {
    clock,
    togglePlayback: () => dispatch({ type: 'toggle' }),
    seekTo: (at: number) => dispatch({ type: 'seek', at }),
    seekBy: (offset: number) => dispatch({ type: 'seek-by', offset }),
    setSpeed: (speed: number) => dispatch({ type: 'speed', speed }),
  };
}
