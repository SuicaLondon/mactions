import type { Job, JobLogs } from '../../../shared/api/types';

export interface CIRecording {
  version: 1;
  repository: string;
  run_id: number;
  started_at: string;
  finished_at: string;
  frames: { at: number; jobs: Job[] }[];
  logs: Record<string, JobLogs>;
}
