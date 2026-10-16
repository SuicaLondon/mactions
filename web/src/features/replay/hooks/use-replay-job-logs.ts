import { useMemo } from 'react';

import type { Job } from '../../../shared/api/types';
import { playbackBounds } from '../models/playback-clock';
import { replayLogsForJob, replayLogTime } from '../models/recording-playback';
import type { CIRecording } from '../types/recording';

/** Replays the selected job's recorded output up to the current position. */
export function useReplayJobLogs(recording: CIRecording, job: Job | undefined, at: number) {
  const logAt = replayLogTime(at, playbackBounds(recording).end);
  return useMemo(() => {
    if (job) return replayLogsForJob(recording, job, logAt);
    return {};
  }, [recording, job, logAt]);
}
