import type { JobLogs } from '../../../../shared/api/types';

export interface ReplayLogs {
  at: number;
  logs: Record<string, JobLogs>;
}
