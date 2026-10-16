import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { afterEach, beforeEach, vi } from 'vitest';

import App from '../app/components/App';
import { startAppSession } from '../app/session/start-app-session';
import type { ActivityRunner, WorkflowRun } from '../features/actions/data/types/activity-types';
import { createQueryClient } from '../shared/api/query-client';
import type { Job, Runner, Snapshot } from '../shared/api/types';

export const runner: Runner = {
  id: 1,
  name: 'build-mac-1',
  target: { kind: 'repo', name: 'example/build' },
  labels: ['build'],
  path: '/managed/actions-runner-1',
  version: '2.999.0',
  github_id: 42,
  enabled: true,
  phase: 'ready',
  error: null,
  deregistered: false,
  registration_attempted: true,
  local_status: 'running',
  github_status: 'online',
  busy: false,
  interrupted: false,
  github_labels: [
    { name: 'self-hosted', type: 'read-only' },
    { name: 'build', type: 'custom' },
  ],
};
export const snapshot: Snapshot = {
  runners: [runner],
  operation_running: false,
  data_directory: '/managed',
};
export const workflowRun: WorkflowRun = {
  id: 420,
  repository: 'example/build',
  workflow_id: 7,
  name: 'CI',
  title: 'Build changes',
  number: 42,
  attempt: 1,
  status: 'completed',
  conclusion: 'success',
  branch: 'main',
  head_sha: 'abcdef123456',
  url: 'https://github.com/example/build/actions/runs/420',
  created_at: '2026-10-01T10:00:00Z',
  started_at: '2026-10-01T10:00:00Z',
  updated_at: '2026-10-01T10:01:30Z',
};
const step = (number: number, name: string, started: string, completed: string) => ({
  number,
  name,
  status: 'completed',
  conclusion: 'success',
  started_at: started,
  completed_at: completed,
});
export const buildJob: Job = {
  id: 101,
  name: 'Build application',
  status: 'completed',
  conclusion: 'success',
  workflow: 'CI',
  repository: 'example/build',
  workflow_id: 7,
  branch: 'main',
  run_id: 420,
  run_number: 42,
  run_attempt: 1,
  run_url: workflowRun.url,
  run_title: workflowRun.title,
  url: `${workflowRun.url}/job/101`,
  runner_id: 42,
  runner_name: runner.name,
  host_type: 'self-hosted',
  device: 'this_device',
  started_at: '2026-10-01T10:00:00Z',
  completed_at: '2026-10-01T10:01:30Z',
  steps: [
    step(1, 'Checkout', '2026-10-01T10:00:00Z', '2026-10-01T10:00:30Z'),
    step(2, 'Compile application', '2026-10-01T10:00:30Z', '2026-10-01T10:01:30Z'),
  ],
};
const externalJob: Job = {
  ...buildJob,
  id: 102,
  name: 'Run tests',
  runner_id: 88,
  runner_name: 'github-worker',
  host_type: 'github-hosted',
  device: 'other_device',
  steps: [],
};
export const historicalJob: Job = {
  ...buildJob,
  id: 100,
  run_id: 419,
  run_number: 41,
  conclusion: 'failure',
  run_url: 'https://github.com/example/build/actions/runs/419',
  started_at: '2026-09-30T10:00:00Z',
  completed_at: '2026-09-30T10:02:00Z',
  steps: [
    {
      ...step(1, 'Compile application', '2026-09-30T10:00:00Z', '2026-09-30T10:02:00Z'),
      conclusion: 'failure',
    },
  ],
};
export const olderRun: WorkflowRun = {
  ...workflowRun,
  id: 419,
  number: 41,
  title: 'Previous build',
  conclusion: 'failure',
};
export const remoteRunner: ActivityRunner = {
  github_id: 88,
  local_id: null,
  name: 'remote-mac',
  status: 'online',
  busy: false,
  labels: ['self-hosted', 'macOS'],
  host_type: 'self-hosted',
  device: 'other_device',
};
export function summary(job: Job) {
  const { steps: _steps, ...item } = job;
  return item;
}

export const fetchMock = vi.fn<typeof fetch>();
export let client: ReturnType<typeof createQueryClient>;

export function response(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** The default backend: one connected account and one managed runner. */
export function dataFor(url: RequestInfo | URL, options?: RequestInit): unknown {
  const path = String(url);
  if (path === '/api/github/connection')
    return { connected: true, login: 'octocat', message: 'Connected' };
  if (path === '/api/github/auth')
    return { status: 'idle', code: null, url: 'https://github.com/login/device' };
  if (path.startsWith('/api/github/targets')) {
    if (path.includes('kind=org'))
      return { items: [{ kind: 'org', name: 'example', private: false }], next_page: null };
    return { items: [{ kind: 'repo', name: 'example/build', private: true }], next_page: null };
  }
  if (path.startsWith('/api/activity/runners'))
    return {
      runners: [
        {
          github_id: runner.github_id,
          local_id: runner.id,
          name: runner.name,
          status: 'online',
          busy: runner.busy,
          labels: ['self-hosted', 'build'],
          host_type: 'self-hosted',
          device: 'this_device',
        },
      ],
      next_page: null,
      message: '',
    };
  if (path.startsWith('/api/activity/work'))
    return {
      runs: [],
      message: 'Current work covers up to 20 running and 20 queued runs per repository.',
    };
  if (path.startsWith('/api/activity/runs')) return { runs: [], next_page: null, message: '' };
  if (path.startsWith('/api/activity/repositories'))
    return { items: [{ kind: 'repo', name: 'example/build', private: true }], next_page: null };
  if (path === '/api/github/check' || path.endsWith('/capabilities'))
    return {
      local: { state: 'available' },
      runner_status: { state: 'available' },
      jobs: { state: 'available' },
      manage: { state: 'unknown' },
      links: [],
    };
  if (path.includes('/logs'))
    return { files: [], content: '', selected: null, truncated: false, total_bytes: 0 };
  if (path.includes('/jobs')) return { jobs: [], message: 'Only assigned jobs.' };
  if (options?.method === 'POST') return {};
  return snapshot;
}

/** The default backend plus one in-progress Run with a local and a GitHub-hosted Job. */
export function activityDataFor(url: RequestInfo | URL, options?: RequestInit): unknown {
  const parsed = new URL(String(url), 'http://localhost');
  const jobs = [summary(buildJob), summary(externalJob)];
  switch (parsed.pathname) {
    case '/api/activity/work':
      return {
        runs: [{ ...workflowRun, status: 'in_progress', conclusion: null, jobs }],
        message: '',
      };
    case '/api/activity/runs':
      return { runs: [workflowRun], next_page: null, message: '' };
    case '/api/activity/run-graph':
      return {
        state: 'complete',
        message: '',
        nodes: [
          {
            id: 'build',
            name: buildJob.name,
            needs: [],
            job_ids: [buildJob.id],
            matrix: false,
            reusable: false,
          },
        ],
        unmapped_job_ids: [],
        source: null,
      };
    case '/api/activity/run':
      if (parsed.searchParams.get('run_id') === '419')
        return { run: olderRun, jobs: [summary(historicalJob)] };
      return { run: workflowRun, jobs };
    case '/api/activity/job': {
      const id = parsed.searchParams.get('job_id');
      if (id === '100') return historicalJob;
      if (id === '102') return externalJob;
      return buildJob;
    }
    case '/api/activity/job-history':
      return {
        jobs: [summary(buildJob), summary(historicalJob)],
        next_page: null,
        message: 'Matching the exact job name within this repository and workflow.',
      };
    case '/api/activity/job-logs':
      return {
        state: 'available',
        content: 'Build finished',
        steps: [],
        message: '',
        scope: 'job',
      };
    default:
      return dataFor(url, options);
  }
}

type Override = (path: string, options?: RequestInit) => Response | Promise<Response> | undefined;

/** Answers requests from `override` first and falls back to `base` for the rest. */
export function serve(override: Override = () => undefined, base = dataFor) {
  fetchMock.mockImplementation(async (url, options) => {
    const answer = override(String(url), options);
    if (answer) return answer;
    return response(base(url, options));
  });
}

export const disconnectedAnswer = () => response({ connected: false, message: 'Not logged in' });

export function serveDisconnected() {
  serve((path) => {
    if (path === '/api/github/connection') return disconnectedAnswer();
  });
}

/** Holds matching requests open until the test releases the latest one. */
export function gate() {
  let release: (value: Response) => void = () => {};
  return {
    next: () =>
      new Promise<Response>((resolve) => {
        release = resolve;
      }),
    release: (value: Response) => release(value),
  };
}

export const posts = () =>
  fetchMock.mock.calls.filter(
    ([url, options]) => options?.method === 'POST' && String(url).startsWith('/api/runners'),
  );
export const postBody = (index = 0): unknown => JSON.parse(String(posts()[index][1]?.body));
export const requested = (match: (url: string) => boolean) =>
  fetchMock.mock.calls.some(([url]) => match(String(url)));
export function requestedActivity(resource: string) {
  return fetchMock.mock.calls
    .map(([url]) => new URL(String(url), 'http://localhost'))
    .filter((url) => url.pathname === `/api/activity/${resource}`);
}
export const savedNavigation = () =>
  JSON.parse(localStorage.getItem('mactions.navigation.v1') || '{}') as Record<string, unknown>;

/** Registers the per-test fetch mock, query client, and a returning visitor. */
export function setupAppTests() {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('mactions.welcome.v1', 'seen');
    client = createQueryClient();
    fetchMock.mockReset();
    serve();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    client.clear();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
}

export function mount() {
  startAppSession();
  return render(createElement(QueryClientProvider, { client }, createElement(App)));
}

export async function openDetails(name = runner.name) {
  await userEvent.click(await screen.findByRole('button', { name: `Details for ${name}` }));
}

/** Mounts with the runner list and account loaded, optionally opening the runner's details. */
export async function ready(details = true) {
  mount();
  await screen.findByRole('button', { name: `Details for ${runner.name}` });
  await screen.findByRole('button', { name: 'GitHub CLI · @octocat' });
  if (details) await openDetails();
}

export const viewButton = (name: 'Runners' | 'Runs') =>
  within(screen.getByRole('group', { name: 'Activity view' })).getByRole('button', { name });
export const breadcrumbs = () =>
  within(screen.getByRole('navigation', { name: 'Page navigation' }));
export const backButton = () => screen.getByRole('button', { name: 'Back' });
