import { compareAsc, isValid, parseISO } from 'date-fns';

import type { Job, JobLogs, JobStep } from '../../../../shared/api/types';
import type { CIRecording } from '../../types/recording';

export function replayFrameAt(recording: CIRecording, at: number): CIRecording['frames'][number] {
  let index = 0;
  for (
    let next = 1;
    next < recording.frames.length && compareAsc(recording.frames[next].at, at) <= 0;
    next++
  )
    index = next;
  return recording.frames[index];
}

function completedAt(item: Job | JobStep, at: number) {
  return (
    item.status === 'completed' &&
    (!item.completed_at || compareAsc(parseISO(item.completed_at), at) <= 0)
  );
}

// Continuation lines inherit the preceding timestamp. Untimed output is only
// revealed after the corresponding job or step has completed in the recording.
export function logContentAt(content: string, at: number, completed: boolean): string {
  let timestamp: Date | null = null;
  return content
    .split('\n')
    .filter((line) => {
      // Match timestamps after ANSI escape sequences in recorded output.

      const match =
        // eslint-disable-next-line no-control-regex -- Recorded ANSI sequences contain the ESC control character.
        /^(?:\u001b\[[\d;]*m)*(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))(?:\s|$)/.exec(
          line,
        );

      if (match) timestamp = parseISO(match[1]);
      if (timestamp == null) return completed;
      return isValid(timestamp) && compareAsc(timestamp, at) <= 0;
    })
    .join('\n');
}

export function replayLogsForJob(
  recording: CIRecording,
  job: Job,
  at: number,
): Record<string, JobLogs> {
  const scoped: Record<string, JobLogs> = {};
  const all = recording.logs[`${job.id}:all`];
  for (const step of [undefined, ...job.steps]) {
    const key = step?.number ?? 'all';
    const capturedStep = step && all?.steps.find((item) => item.number === step.number);
    let saved = recording.logs[`${job.id}:${key}`];
    if (saved == null && capturedStep && all) {
      saved = {
        ...all,
        scope: 'step',
        content: capturedStep.content,
        steps: [capturedStep],
        unassigned_content: undefined,
      };
    }
    if (!saved) {
      let state: JobLogs['state'] = 'pending';
      if (completedAt(step ?? job, at)) state = 'unavailable';
      scoped[key] = {
        state,
        message: 'No output was captured for this part of the run.',
        content: '',
        steps: [],
      };
      continue;
    }
    if (saved.state !== 'available') {
      scoped[key] = saved;
      continue;
    }
    const completed = completedAt(step ?? job, at);
    const content = logContentAt(saved.content, at, completed);
    let message = saved.message;
    if (!completed) {
      message = 'No recorded output at this point in the run.';
      if (content) message = 'Recorded output up to this point in the run.';
    }
    let state: JobLogs['state'] = 'pending';
    if (content || completed) state = 'available';
    const replayed: JobLogs = {
      ...saved,
      state,
      message,
      content,
      steps: saved.steps.map((item) => ({
        ...item,
        content: logContentAt(
          item.content,
          at,
          completedAt(job.steps.find((candidate) => candidate.number === item.number) ?? job, at),
        ),
      })),
    };
    if (saved.unassigned_content != null) {
      replayed.unassigned_content = logContentAt(
        saved.unassigned_content,
        at,
        completedAt(job, at),
      );
    }
    scoped[key] = replayed;
  }
  return scoped;
}
