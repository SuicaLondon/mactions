import type { ReplayLogs } from './replay-logs';

/** Where a job's log output comes from, apart from the job and step it belongs to. */
export interface JobLogSource {
  repository: string;
  /** The local runner whose log endpoint serves the output, instead of repository activity. */
  runnerId?: number;
  /** Recorded output shown instead of GitHub's; it never refreshes. */
  replay?: ReplayLogs;
}
