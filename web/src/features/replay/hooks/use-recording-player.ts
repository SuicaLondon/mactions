import { addMilliseconds, clamp, compareAsc, getTime, parseISO, startOfSecond } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';

import { replayFrameAt, replayLogsForJob } from '../models/recording/recording-playback';
import type { CIRecording } from '../types/recording';
export function useRecordingPlayer(recording: CIRecording) {
  const start = recording.frames[0].at;
  const end = getTime(parseISO(recording.finished_at));
  const [at, setAt] = useState(start);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const frame = replayFrameAt(recording, at);
  const selectedJob =
    frame.jobs.find((job) => job.id === selectedJobId) ??
    frame.jobs.find((job) => job.status === 'in_progress') ??
    frame.jobs[0];
  const ended = compareAsc(at, end) >= 0;
  let logAt: number;
  if (ended) logAt = end;
  else logAt = getTime(startOfSecond(at));
  const logs = useMemo(() => {
    if (selectedJob) return replayLogsForJob(recording, selectedJob, logAt);
    return {};
  }, [recording, selectedJob, logAt]);
  useEffect(() => {
    if (!playing) return;
    let previous = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const elapsed = (now - previous) * speed;
      previous = now;
      setAt((current) => getTime(clamp(addMilliseconds(current, elapsed), { start, end })));
    }, 250);
    return () => window.clearInterval(timer);
  }, [playing, speed, start, end]);
  useEffect(() => {
    // eslint-disable-next-line react-x/set-state-in-effect -- Stop playback when the timer reaches the recording boundary.
    if (ended) setPlaying(false);
  }, [ended]);
  let playLabel = 'Play';
  if (playing) playLabel = 'Pause';
  else if (ended) playLabel = 'Replay';
  return {
    start,
    end,
    at,
    setAt,
    playing,
    setPlaying,
    speed,
    setSpeed,
    selectedJob,
    setSelectedJobId,
    frame,
    logs,
    playLabel,
    ended,
  };
}
