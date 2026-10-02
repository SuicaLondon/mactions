export interface RunnerLabel { name: string; type: string }
export interface Runner {
  id: number;
  name: string;
  target: { kind: 'repo' | 'org'; name: string };
  labels: string[];
  path: string;
  version: string | null;
  github_id: number | null;
  enabled: boolean;
  phase: string;
  error: string | null;
  deregistered: boolean;
  registration_attempted: boolean;
  local_status: string;
  local_error?: string;
  github_status: string;
  github_error?: string;
  github_labels?: RunnerLabel[];
  busy: boolean | null;
  interrupted: boolean;
}
export interface Snapshot { runners: Runner[]; operation_running: boolean; data_directory: string }
export interface CreateRunner { kind: 'repo' | 'org'; target: string; prefix: string; labels: string[]; registration_token?: string }
export type Action = 'start' | 'stop' | 'restart' | 'retry' | 'labels' | 'delete';
export interface Operation { path: string; payload: unknown; message: string }
export type Filter = 'all' | 'active' | 'stopped' | 'attention';

export interface Connection { connected: boolean; login?: string; message: string; state?: 'connected' | 'disconnected' | 'unavailable' }
export interface LoginAttempt { status: 'idle' | 'pending' | 'complete' | 'failed' | 'expired'; code: string | null; url: string }
export interface TargetOption { kind: 'repo' | 'org'; name: string; private: boolean }
export interface Targets { items: TargetOption[]; next_page: number | null }
export interface Capability { state: 'available' | 'unknown' | 'unavailable'; message?: string }
export interface Capabilities { runner_status: Capability; jobs: Capability; manage: Capability; local: Capability; links: { label: string; url: string }[] }
export interface LogSnapshot { files: { name: string; bytes: number; modified: number }[]; selected: string | null; content: string; truncated: boolean; total_bytes: number }
export interface JobStep { number: number; name: string; status: string; conclusion: string | null; started_at?: string | null; completed_at?: string | null }
export interface Job {
  id: number; name: string; status: string; conclusion: string | null;
  started_at: string | null; completed_at: string | null; created_at?: string | null;
  workflow: string; branch: string; run_number: number; url: string; steps: JobStep[];
  run_id?: number | null; run_attempt?: number | null; run_url?: string | null;
  workflow_url?: string | null; workflow_path?: string | null; event?: string | null;
  actor?: string | null; triggering_actor?: string | null; run_title?: string | null; head_sha?: string | null; commit_message?: string | null;
  runner_name?: string | null; runner_group_name?: string | null; labels?: string[];
}
export interface JobLogs {
  state: 'available' | 'pending' | 'unavailable'; message: string; content: string;
  scope?: 'job' | 'step';
  steps: { number: number; name: string; content: string }[];
  unassigned_content?: string;
}
export interface Jobs { jobs: Job[]; needs_repository?: boolean; repository?: string; limited?: boolean; message: string }
