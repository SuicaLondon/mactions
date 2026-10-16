import type { ManagerUpdateStatus } from '../types/manager';

export interface ManagerUpdateProgressInput {
  running: boolean;
  status: ManagerUpdateStatus | undefined;
  statusError: Error | null;
  statusErrorCount: number;
  startError: Error | null;
  healthErrorCount: number;
}

export type ManagerUpdateProgress =
  | { kind: 'none' }
  | { kind: 'unreachable' }
  | { kind: 'reconnecting' }
  | { kind: 'start-failed'; message: string }
  | { kind: 'status-failed'; message: string }
  | { kind: 'reported'; status: ManagerUpdateStatus; reconnectStalled: boolean };

/** Chooses the single update progress line the settings dialog shows. */
export function managerUpdateProgress({
  running,
  status,
  statusError,
  statusErrorCount,
  startError,
  healthErrorCount,
}: ManagerUpdateProgressInput): ManagerUpdateProgress {
  if (running && statusErrorCount >= 40) return { kind: 'unreachable' };
  if (running && statusError) return { kind: 'reconnecting' };
  if (startError && status?.state === 'idle')
    return { kind: 'start-failed', message: startError.message };
  if (statusError && !running) return { kind: 'status-failed', message: statusError.message };
  if (!status || status.state === 'idle') return { kind: 'none' };
  return {
    kind: 'reported',
    status,
    reconnectStalled: status.state === 'complete' && healthErrorCount >= 30,
  };
}
