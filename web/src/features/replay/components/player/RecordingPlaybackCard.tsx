import { type ReactNode } from 'react';

import { cn } from '../../../../shared/lib/cn';
import { formatDateTime, formatUtcTimestamp } from '../../../../shared/lib/date';
import { type CIRecording } from '../../types/recording';
import { RecordingIdentity } from './RecordingIdentity';

interface RecordingPlaybackCardProps {
  recording: CIRecording;
  at: number;
  /** The playback transport, placed between the recording identity and its caption. */
  children: ReactNode;
}

/** Frames the playback controls with the recording they play and the moment shown. */
export function RecordingPlaybackCard({ recording, at, children }: RecordingPlaybackCardProps) {
  return (
    <section
      className="rounded-lg border border-line bg-surface px-4 py-3.5 max-sm:p-3"
      aria-label="Recording playback"
    >
      <RecordingIdentity recording={recording} />
      {children}
      <div
        className={cn(
          'mt-2.5 flex flex-wrap justify-between gap-x-3 gap-y-1.5 text-xs',
          'text-muted',
        )}
      >
        <time dateTime={formatUtcTimestamp(at)}>{formatDateTime(at)}</time>
        <span>Recorded snapshots · {recording.frames.length} frames</span>
      </div>
    </section>
  );
}
