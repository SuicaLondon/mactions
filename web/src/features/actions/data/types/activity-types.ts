import type { Job, RunnerLabel } from '../../../../shared/api/types';

export interface Scope {
  organization: string;
  repository: string;
}
export type HostType = 'self-hosted' | 'github-hosted' | 'unknown';
export type Device = 'this_device' | 'other_device' | 'unknown';

export interface ActivityRunner {
  github_id: number | null;
  local_id: number | null;
  name: string;
  status: string;
  busy: boolean | null;
  labels: string[];
  github_labels?: RunnerLabel[];
  host_type: HostType;
  device: Device;
  target?: { kind: 'repo' | 'org'; name: string };
}

export interface JobSummary extends Omit<Job, 'steps'> {
  repository: string;
  workflow_id: number;
  runner_id: number | null;
  host_type: HostType;
  device: Device;
}

export interface WorkflowRun {
  id: number;
  repository: string;
  workflow_id: number;
  name: string;
  title: string;
  number: number;
  attempt: number;
  status: string;
  conclusion: string | null;
  branch: string;
  head_sha: string;
  url: string;
  created_at: string | null;
  started_at: string | null;
  updated_at: string | null;
  jobs?: JobSummary[];
}

export interface ActivityRunners {
  runners: ActivityRunner[];
  next_page: number | null;
  message: string;
  refresh_after_seconds?: number;
}
export interface RunnerWork {
  runs: WorkflowRun[];
  message: string;
  refresh_after_seconds?: number;
}
export interface ActivityRuns {
  runs: WorkflowRun[];
  next_page: number | null;
  message: string;
  refresh_after_seconds?: number;
}
export interface RunActivity {
  run: WorkflowRun;
  jobs: JobSummary[];
}
export interface JobHistoryPage {
  jobs: JobSummary[];
  next_page: number | null;
  message: string;
  refresh_after_seconds?: number;
}
