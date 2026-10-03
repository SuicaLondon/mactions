import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ActivityRunner, WorkflowRun } from '../../features/actions/data/types/activity-types';
import { CONNECTION_KEY } from '../../features/github/hooks/connection/use-connection';
import { RUNNERS_KEY } from '../../features/runners/data/hooks/use-runner-snapshot';
import { createQueryClient } from '../../shared/api/query-client';
import type { Job, Runner, Snapshot } from '../../shared/api/types';
import { useNavigation } from '../navigation/hooks/use-navigation';
import { AppProviders } from '../providers/components/AppProviders';
import { useRunnerWorkspace } from '../runners/hooks/use-runner-workspace';
import App from './App';

const runner: Runner = {
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
const snapshot: Snapshot = {
  runners: [runner],
  operation_running: false,
  data_directory: '/managed',
};
const workflowRun: WorkflowRun = {
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
const buildJob: Job = {
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
    {
      number: 1,
      name: 'Checkout',
      status: 'completed',
      conclusion: 'success',
      started_at: '2026-10-01T10:00:00Z',
      completed_at: '2026-10-01T10:00:30Z',
    },
    {
      number: 2,
      name: 'Compile application',
      status: 'completed',
      conclusion: 'success',
      started_at: '2026-10-01T10:00:30Z',
      completed_at: '2026-10-01T10:01:30Z',
    },
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
const historicalJob: Job = {
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
      number: 1,
      name: 'Compile application',
      status: 'completed',
      conclusion: 'failure',
      started_at: '2026-09-30T10:00:00Z',
      completed_at: '2026-09-30T10:02:00Z',
    },
  ],
};
const remoteRunner: ActivityRunner = {
  github_id: 88,
  local_id: null,
  name: 'remote-mac',
  status: 'online',
  busy: false,
  labels: ['self-hosted', 'macOS'],
  host_type: 'self-hosted',
  device: 'other_device',
};
function summary(job: Job) {
  const { steps: _steps, ...item } = job;
  return item;
}

const fetchMock = vi.fn<typeof fetch>();
let client: ReturnType<typeof createQueryClient>;
function response(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
const posts = () =>
  fetchMock.mock.calls.filter(
    ([url, options]) => options?.method === 'POST' && String(url).startsWith('/api/runners'),
  );
const capabilities = {
  local: { state: 'available' },
  runner_status: { state: 'available' },
  jobs: { state: 'available' },
  manage: { state: 'unknown' },
  links: [],
};
function dataFor(url: RequestInfo | URL, options?: RequestInit): unknown {
  const path = String(url);
  if (path === '/api/github/connection')
    return { connected: true, login: 'octocat', message: 'Connected' };
  if (path === '/api/github/auth')
    return { status: 'idle', code: null, url: 'https://github.com/login/device' };
  if (path.startsWith('/api/github/targets')) {
    let items = [{ kind: 'repo', name: 'example/build', private: true }];
    if (path.includes('kind=org')) items = [{ kind: 'org', name: 'example', private: false }];
    return { items, next_page: null };
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
  if (path === '/api/github/check' || path.endsWith('/capabilities')) return capabilities;
  if (path.includes('/logs'))
    return { files: [], content: '', selected: null, truncated: false, total_bytes: 0 };
  if (path.includes('/jobs')) return { jobs: [], message: 'Only assigned jobs.' };
  if (options?.method === 'POST') return {};
  return snapshot;
}

function activityDataFor(url: RequestInfo | URL, options?: RequestInit): unknown {
  const parsed = new URL(String(url), 'http://localhost');
  if (parsed.pathname === '/api/activity/work')
    return {
      runs: [
        {
          ...workflowRun,
          status: 'in_progress',
          conclusion: null,
          jobs: [summary(buildJob), summary(externalJob)],
        },
      ],
      message: '',
    };
  if (parsed.pathname === '/api/activity/runs')
    return { runs: [workflowRun], next_page: null, message: '' };
  if (parsed.pathname === '/api/activity/run-graph')
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
  if (parsed.pathname === '/api/activity/run')
    return { run: workflowRun, jobs: [summary(buildJob), summary(externalJob)] };
  if (parsed.pathname === '/api/activity/job') {
    if (parsed.searchParams.get('job_id') === '100') return historicalJob;
    if (parsed.searchParams.get('job_id') === '102') return externalJob;
    return buildJob;
  }
  if (parsed.pathname === '/api/activity/job-history')
    return {
      jobs: [summary(buildJob), summary(historicalJob)],
      next_page: null,
      message: 'Matching the exact job name within this repository and workflow.',
    };
  if (parsed.pathname === '/api/activity/job-logs')
    return { state: 'available', content: 'Build finished', steps: [], message: '', scope: 'job' };
  return dataFor(url, options);
}
function requestedActivity(resource: string) {
  return fetchMock.mock.calls
    .map(([url]) => new URL(String(url), 'http://localhost'))
    .filter((url) => url.pathname === `/api/activity/${resource}`);
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('mactions.welcome.v1', 'seen');
  client = createQueryClient();
  fetchMock.mockReset().mockImplementation(async (url, options) => response(dataFor(url, options)));
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  client.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
function mount() {
  return render(
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>,
  );
}
async function openDetails(name = runner.name) {
  await userEvent.click(await screen.findByRole('button', { name: `Details for ${name}` }));
}
async function ready(details = true) {
  mount();
  await screen.findByRole('button', { name: `Details for ${runner.name}` });
  await screen.findByRole('button', { name: 'GitHub CLI · @octocat' });
  if (details) await openDetails();
}
async function chooseRepo(
  dialog: ReturnType<typeof within>,
  user: ReturnType<typeof userEvent.setup>,
) {
  await user.click(dialog.getByRole('button', { name: 'Continue to Target' }));
  await user.click(dialog.getByRole('combobox', { name: 'Repository' }));
  await user.click(await dialog.findByRole('option', { name: /example\/build/ }));
}

describe('runner management UI', () => {
  it('keeps activity views parallel and loads access only after opening runner details', async () => {
    await ready(false);
    const activity = within(screen.getByRole('group', { name: 'Activity view' }));
    expect(activity.getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Runners',
      'Runs',
    ]);
    expect(screen.queryByRole('complementary', { name: 'Runner details' })).not.toBeInTheDocument();
    await openDetails();
    expect(
      screen.queryByRole('heading', { name: /^Workflow runs for build-mac-1/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Replay$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Access$/ })).not.toBeInTheDocument();
    const inspector = within(screen.getByRole('complementary', { name: 'Runner details' }));
    const summary = inspector.getByText('GitHub access');
    expect(summary.closest('details')).not.toHaveAttribute('open');
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/capabilities'))).toBe(false);
    await userEvent.click(summary);
    expect(await inspector.findByText('Runner management')).toBeVisible();
    expect(summary.closest('details')).toHaveAttribute('open');
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/runners/1/capabilities')).toBe(true);
  });

  it('resets the access disclosure and checks the selected runner', async () => {
    const second = {
      ...runner,
      id: 2,
      name: 'second-mac',
      target: { kind: 'repo' as const, name: 'example/second' },
    };
    fetchMock.mockImplementation(async (url, options) => {
      if (
        String(url).startsWith('/api/runners') &&
        !String(url).endsWith('/capabilities') &&
        !String(url).includes('/logs')
      )
        return response({ ...snapshot, runners: [runner, second] });
      return response(dataFor(url, options));
    });
    await ready();
    await userEvent.click(screen.getByText('GitHub access'));
    await screen.findByText('Runner management');
    await openDetails('second-mac');
    const summary = screen.getByText('GitHub access');
    expect(summary.closest('details')).not.toHaveAttribute('open');
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/runners/2/capabilities')).toBe(false);
    await userEvent.click(summary);
    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([url]) => url === '/api/runners/2/capabilities')).toBe(
        true,
      ),
    );
  });

  it('opens runner actions by right click and retains confirmation', async () => {
    await ready();
    const row = screen.getByRole('row', { name: /build-mac-1/ });
    fireEvent.contextMenu(row, { clientX: 150, clientY: 120 });
    expect(screen.getByRole('menuitem', { name: 'Stop…' })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(row).toHaveFocus();
    fireEvent.keyDown(row, { key: 'F10', shiftKey: true });
    await userEvent.click(screen.getByRole('menuitem', { name: 'Delete Runner…' }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeVisible();
    expect(posts()).toHaveLength(0);
  });

  it('searches labels and navigates rows without losing keyboard focus', async () => {
    client.setQueryData(RUNNERS_KEY, {
      ...snapshot,
      runners: [runner, { ...runner, id: 2, name: 'second-mac' }],
    });
    mount();
    const row = screen.getByRole('row', { name: /build-mac-1/ });
    row.focus();
    fireEvent.keyDown(row, { key: 'ArrowDown' });
    expect(screen.getByRole('row', { name: /second-mac/ })).toHaveFocus();
    const user = userEvent.setup();
    await user.type(screen.getByRole('searchbox'), 'missing');
    expect(screen.getByText('No Matching Runners')).toBeVisible();
    await user.clear(screen.getByRole('searchbox'));
    expect(screen.getByRole('searchbox')).toHaveFocus();
    expect(screen.getByRole('row', { name: /build-mac-1/ })).toBeVisible();
  });

  it('keeps an edited form and its focus during background snapshot updates', async () => {
    await ready();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Edit…' }));
    const input = screen.getByRole('textbox', { name: 'Custom labels' });
    await user.clear(input);
    await user.type(input, 'release');
    act(() =>
      client.setQueryData(RUNNERS_KEY, { ...snapshot, runners: [{ ...runner, busy: true }] }),
    );
    expect(input).toHaveValue('release');
    expect(input).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Save labels' }));
    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(posts()[0][0]).toBe('/api/runners/1/labels');
    expect(JSON.parse(String(posts()[0][1]?.body))).toEqual({ labels: ['release'] });
  });

  it('clears only custom labels and never sends the read-only defaults', async () => {
    await ready();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Edit…' }));
    expect(screen.getByRole('textbox', { name: 'Custom labels' })).toHaveValue('build');
    await user.clear(screen.getByRole('textbox', { name: 'Custom labels' }));
    await user.click(screen.getByRole('button', { name: 'Save labels' }));
    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(JSON.parse(String(posts()[0][1]?.body))).toEqual({ labels: [] });
  });

  it('requires explicit delete confirmation and sends the original runner identity', async () => {
    await ready();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Delete Runner…' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(posts()).toHaveLength(0);
    await user.click(screen.getByRole('button', { name: 'Delete Runner…' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(posts()[0][0]).toBe('/api/runners/1/delete');
    expect(JSON.parse(String(posts()[0][1]?.body))).toEqual({ confirm: true });
  });

  it('creates from a connected target without a separate read access check', async () => {
    await ready();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Add Runner' }));
    const dialog = within(screen.getByRole('dialog'));
    await chooseRepo(dialog, user);

    expect(dialog.queryByRole('button', { name: 'Check access' })).not.toBeInTheDocument();
    expect(dialog.getByRole('button', { name: 'Next' })).toBeEnabled();
    await user.click(dialog.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/github/check')).toBe(false);
  });

  it('creates an organization runner with the supplied naming and labels', async () => {
    await ready();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Add Runner' }));
    const dialog = within(screen.getByRole('dialog'));
    await user.click(dialog.getByRole('button', { name: 'Continue to Target' }));
    await user.click(dialog.getByRole('button', { name: /^Organization:/ }));
    await user.click(dialog.getByRole('combobox', { name: 'Organization' }));
    await user.click(await dialog.findByRole('option', { name: /example.*Organization/ }));

    await user.click(dialog.getByText('Advanced settings'));
    await user.clear(dialog.getByLabelText('Name prefix'));
    await user.type(dialog.getByLabelText('Name prefix'), 'studio');
    await user.type(dialog.getByLabelText('Custom labels'), 'build, release');
    expect(dialog.getByRole('button', { name: 'Next' })).toBeEnabled();
    await user.click(dialog.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(JSON.parse(String(posts()[0][1]?.body))).toEqual({
      kind: 'org',
      target: 'example',
      prefix: 'studio',
      labels: ['build', 'release'],
    });
    expect(posts()[0][1]?.headers).toEqual({
      'Content-Type': 'application/json',
      'X-Mactions': '1',
    });
  });

  it('does not retry failed mutations or claim that a failed stop succeeded', async () => {
    fetchMock.mockImplementation(async (url, options) => {
      if (options?.method === 'POST')
        return response({ error: 'Runner processes have not exited.' }, 400);
      return response(dataFor(url, options));
    });
    await ready();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Stop' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Stop' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Runner processes have not exited.',
    );
    await waitFor(() => expect(screen.getByRole('button', { name: 'Stop' })).toBeEnabled());
    expect(posts()).toHaveLength(1);
  });
});

it('uses a searchable select and clears the repository when switching scope', async () => {
  await ready();
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Add Runner' }));
  const dialog = within(screen.getByRole('dialog'));
  expect(dialog.queryByRole('combobox')).not.toBeInTheDocument();
  expect(fetchMock.mock.calls.some(([url]) => String(url).startsWith('/api/github/targets'))).toBe(
    false,
  );
  await chooseRepo(dialog, user);
  expect(dialog.getByText('example/build')).toBeVisible();
  expect(dialog.queryByRole('button', { name: 'Change' })).not.toBeInTheDocument();
  await user.click(dialog.getByRole('button', { name: /^Organization:/ }));
  expect(dialog.getByRole('combobox', { name: 'Organization' })).toHaveValue('');
  expect(dialog.getByRole('button', { name: 'Next' })).toBeDisabled();
  await user.click(dialog.getByRole('combobox', { name: 'Organization' }));
  await dialog.findByRole('option', { name: /example.*Organization/ });
  expect(dialog.queryByRole('option', { name: /example\/build/ })).not.toBeInTheDocument();
});

it('preserves the selected target and advanced settings when moving Back', async () => {
  await ready();
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Add Runner' }));
  const dialog = within(screen.getByRole('dialog'));
  await chooseRepo(dialog, user);

  await user.click(dialog.getByText('Advanced settings'));
  await user.clear(dialog.getByLabelText('Name prefix'));
  await user.type(dialog.getByLabelText('Name prefix'), 'studio');
  await user.click(dialog.getByRole('button', { name: 'Back' }));
  expect(dialog.getByRole('group', { name: 'Registration method' })).toBeVisible();
  await user.click(dialog.getByRole('button', { name: 'Continue to Target' }));

  await user.click(dialog.getByText('Advanced settings'));
  expect(dialog.getByLabelText('Name prefix')).toHaveValue('studio');
  expect(dialog.getByText('example/build')).toBeVisible();
});

it('accepts GitHub URLs in registration token mode', async () => {
  await ready();
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Add Runner' }));
  const dialog = within(screen.getByRole('dialog'));
  await user.click(dialog.getByRole('button', { name: /^Registration Token:/ }));
  await user.click(dialog.getByRole('button', { name: 'Continue to Target' }));
  await user.type(dialog.getByLabelText('Repository'), 'https://github.com/example/build');

  await user.type(dialog.getByLabelText('Registration token'), 'fixture-token');
  expect(dialog.getByRole('button', { name: 'Next' })).toBeEnabled();
  await user.click(dialog.getByRole('button', { name: 'Next' }));
  await waitFor(() => expect(posts()).toHaveLength(1));
  expect(JSON.parse(String(posts()[0][1]?.body))).toMatchObject({
    kind: 'repo',
    target: 'example/build',
  });
});

it('rejects a repository URL while organization scope is selected', async () => {
  await ready();
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Add Runner' }));
  const dialog = within(screen.getByRole('dialog'));
  await user.click(dialog.getByRole('button', { name: /^Registration Token:/ }));
  await user.click(dialog.getByRole('button', { name: 'Continue to Target' }));
  await user.click(dialog.getByRole('button', { name: /^Organization:/ }));
  await user.type(dialog.getByLabelText('Organization'), 'https://github.com/example/build');
  expect(dialog.getByText(/Use the organization name/)).toBeVisible();
  expect(dialog.getByRole('button', { name: 'Next' })).toBeDisabled();
});

it('creates with a registration token without a GitHub login or access check', async () => {
  fetchMock.mockImplementation(async (url, options) => {
    if (String(url) === '/api/github/connection')
      return response({ connected: false, message: 'Not logged in' });
    return response(dataFor(url, options));
  });
  mount();
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: 'Add Runner' }));
  const dialog = within(screen.getByRole('dialog'));
  await user.click(dialog.getByRole('button', { name: /^Registration Token:/ }));
  await user.click(dialog.getByRole('button', { name: 'Continue to Target' }));
  await user.type(dialog.getByLabelText('Repository'), 'https://github.com/example/build');

  await user.type(dialog.getByLabelText('Registration token'), 'fixture-token');
  await user.click(dialog.getByRole('button', { name: 'Next' }));
  await waitFor(() => expect(posts()).toHaveLength(1));
  expect(JSON.parse(String(posts()[0][1]?.body))).toMatchObject({
    kind: 'repo',
    target: 'example/build',
    registration_token: 'fixture-token',
  });
  expect(fetchMock.mock.calls.some(([url]) => url === '/api/github/check')).toBe(false);
});

it('keeps the target after registration needs SSO and allows retry', async () => {
  let authorized = false;
  fetchMock.mockImplementation(async (url, options) => {
    if (url === '/api/runners' && options?.method === 'POST' && !authorized) {
      return response({ error: 'GitHub requires SSO authorization.' }, 400);
    }
    return response(dataFor(url, options));
  });
  await ready();
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Add Runner' }));
  const dialog = within(screen.getByRole('dialog'));
  await chooseRepo(dialog, user);

  await user.click(dialog.getByRole('button', { name: 'Next' }));
  expect(await dialog.findByText(/GitHub requires SSO authorization/)).toBeVisible();
  expect(dialog.getByText('example/build')).toBeVisible();
  expect(dialog.getByRole('button', { name: 'Connection settings' })).toBeVisible();
  authorized = true;
  await user.click(dialog.getByRole('button', { name: 'Next' }));
  await waitFor(() => expect(posts()).toHaveLength(2));
  expect(fetchMock.mock.calls.some(([url]) => url === '/api/github/check')).toBe(false);
});

it('shows local logs and local controls while GitHub is disconnected', async () => {
  fetchMock.mockImplementation(async (url, options) => {
    if (String(url) === '/api/github/connection') {
      return response({ connected: false, message: 'Not logged in' });
    }
    if (String(url).includes('/logs')) {
      return response({
        files: [{ name: '_diag/Runner_1.log', bytes: 12 }],
        selected: '_diag/Runner_1.log',
        content: 'Listening for Jobs',
        truncated: false,
        total_bytes: 12,
      });
    }
    return response(dataFor(url, options));
  });
  mount();
  await openDetails();
  const logButton = screen.getByRole('button', { name: 'Runner diagnostic logs' });
  expect(
    logButton.compareDocumentPosition(screen.getByRole('button', { name: 'Delete Runner…' })) &
      Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Stop' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Restart' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Delete Runner…' })).toBeDisabled();
  const user = userEvent.setup();
  await user.click(logButton);
  expect(await screen.findByText('Listening for Jobs')).toBeVisible();
  expect(screen.queryByRole('complementary', { name: 'Runner details' })).not.toBeInTheDocument();
  expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Wrap lines' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(screen.getByLabelText('Runner log output')).toHaveClass('log-wrapped');
  await user.click(screen.getByRole('button', { name: 'Wrap lines' }));
  expect(screen.getByLabelText('Runner log output')).not.toHaveClass('log-wrapped');
  await user.click(screen.getByRole('button', { name: 'Follow output' }));
  expect(screen.getByRole('button', { name: 'Follow output' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await user.click(screen.getByRole('button', { name: 'Pause live updates' }));
  expect(screen.getByRole('button', { name: 'Resume live updates' })).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Back' }));
  expect(screen.queryByText('Listening for Jobs')).not.toBeInTheDocument();
  await user.click(
    within(screen.getByRole('group', { name: 'Activity view' })).getByRole('button', {
      name: 'Runs',
    }),
  );
  expect(screen.getByRole('heading', { name: 'Connect GitHub to view runs' })).toBeVisible();
  expect(fetchMock.mock.calls.some(([url]) => String(url).startsWith('/api/activity/runs'))).toBe(
    false,
  );
});

it('shows a device code and a browser link without depending on the host browser', async () => {
  let started = false;
  fetchMock.mockImplementation(async (url, options) => {
    if (url === '/api/github/connection')
      return response({ connected: false, message: 'Not logged in' });
    if (url === '/api/github/auth') {
      if (options?.method === 'POST') started = true;
      let status = 'idle';
      let code: string | null = null;
      if (started) {
        status = 'pending';
        code = 'ABCD-1234';
      }
      return response({ status, code, url: 'https://github.com/login/device' });
    }
    return response(dataFor(url, options));
  });
  mount();
  const user = userEvent.setup();
  expect(
    await screen.findByRole('heading', { name: 'Connect GitHub to get started' }),
  ).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Start GitHub authorization' }));
  expect(await screen.findByText('ABCD-1234')).toBeVisible();
  expect(screen.getByRole('link', { name: 'Open GitHub ↗' })).toHaveAttribute(
    'href',
    'https://github.com/login/device',
  );
  expect(screen.getByRole('link', { name: 'Open GitHub ↗' })).toHaveAttribute('target', '_blank');
});

it('keeps a creation form after a denied registration and provides authorization controls', async () => {
  fetchMock.mockImplementation(async (url, options) => {
    if (url === '/api/runners' && options?.method === 'POST')
      return response({ error: 'Organization approval is required.' }, 400);
    return response(dataFor(url, options));
  });
  await ready();
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Add Runner' }));
  const dialog = within(screen.getByRole('dialog'));
  await chooseRepo(dialog, user);

  expect(dialog.getByRole('button', { name: 'Next' })).toBeEnabled();
  await user.click(dialog.getByRole('button', { name: 'Next' }));
  expect(await dialog.findByText(/Organization approval is required/)).toBeVisible();
  expect(dialog.getByText('example/build')).toBeVisible();
  expect(dialog.getByRole('button', { name: 'Connection settings' })).toBeVisible();
});

it('reuses an existing GitHub connection without prompting for login', async () => {
  await ready();
  expect(
    screen.queryByRole('heading', { name: 'Connect GitHub to get started' }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Start GitHub authorization' }),
  ).not.toBeInTheDocument();
  expect(
    fetchMock.mock.calls.some(
      ([url, options]) => url === '/api/github/auth' && options?.method === 'POST',
    ),
  ).toBe(false);
});

it('guides disconnected users immediately and lets them keep using local controls', async () => {
  fetchMock.mockImplementation(async (url, options) => {
    if (String(url) === '/api/github/connection')
      return response({ connected: false, message: 'Not logged in' });
    return response(dataFor(url, options));
  });
  mount();
  const user = userEvent.setup();
  expect(
    await screen.findByRole('heading', { name: 'Connect GitHub to get started' }),
  ).toBeVisible();
  expect(screen.getByRole('button', { name: 'Start GitHub authorization' })).toBeVisible();
  await user.click(screen.getByText('Prefer the terminal?'));
  expect(screen.getByText('gh auth login --hostname github.com --web')).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Continue with local controls' }));
  expect(
    screen.queryByRole('heading', { name: 'Connect GitHub to get started' }),
  ).not.toBeInTheDocument();
  await openDetails();
  expect(screen.getByRole('button', { name: 'Stop' })).toBeEnabled();
  await user.click(screen.getByRole('button', { name: 'Connect GitHub' }));
  expect(screen.getByRole('button', { name: 'Start GitHub authorization' })).toBeVisible();
});

it('opens the registration token path directly from the connection guide', async () => {
  fetchMock.mockImplementation(async (url, options) => {
    if (String(url) === '/api/github/connection')
      return response({ connected: false, message: 'Not logged in' });
    return response(dataFor(url, options));
  });
  mount();
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: 'Use a registration token instead' }));
  const dialog = within(screen.getByRole('dialog'));
  await user.type(dialog.getByLabelText('Repository'), 'example/build');

  await user.type(dialog.getByLabelText('Registration token'), 'fixture-token');
  await user.click(dialog.getByRole('button', { name: 'Next' }));
  await waitFor(() => expect(posts()).toHaveLength(1));
  expect(JSON.parse(String(posts()[0][1]?.body))).toMatchObject({
    registration_token: 'fixture-token',
  });
});

it('collapses login guidance when authorization completes and refreshes the account', async () => {
  let connected = false;
  fetchMock.mockImplementation(async (url, options) => {
    if (String(url) === '/api/github/connection') {
      let login: string | null = null;
      if (connected) login = 'octocat';
      return response({ connected, login });
    }
    return response(dataFor(url, options));
  });
  mount();
  expect(
    await screen.findByRole('heading', { name: 'Connect GitHub to get started' }),
  ).toBeVisible();
  connected = true;
  act(() => client.setQueryData(['github-auth'], { status: 'complete', code: null }));
  expect(await screen.findByRole('button', { name: 'GitHub CLI · @octocat' })).toBeVisible();
  expect(
    screen.queryByRole('heading', { name: 'Connect GitHub to get started' }),
  ).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Authorize GitHub again' })).not.toBeInTheDocument();
});

it('reuses the GitHub CLI login on a fresh visit without opening setup', async () => {
  localStorage.removeItem('mactions.welcome.v1');
  const view = mount();
  const user = userEvent.setup();
  expect(await screen.findByRole('button', { name: 'GitHub CLI · @octocat' })).toBeVisible();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Start GitHub authorization' }),
  ).not.toBeInTheDocument();
  expect(
    fetchMock.mock.calls.some(
      ([url, options]) => url === '/api/github/auth' && options?.method === 'POST',
    ),
  ).toBe(false);
  view.unmount();
  mount();
  expect(await screen.findByRole('button', { name: 'GitHub CLI · @octocat' })).toBeVisible();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'GitHub CLI · @octocat' }));
  expect(screen.getByRole('dialog', { name: 'Welcome to mactions' })).toBeVisible();
});

it('remembers reused CLI login and avoids reopening onboarding after disconnection', async () => {
  localStorage.removeItem('mactions.welcome.v1');
  mount();
  expect(await screen.findByRole('button', { name: 'GitHub CLI · @octocat' })).toBeVisible();
  await waitFor(() => expect(localStorage.getItem('mactions.welcome.v1')).toBe('seen'));
  await openDetails();
  act(() =>
    client.setQueryData(CONNECTION_KEY, {
      connected: false,
      state: 'disconnected',
      message: 'Not logged in',
    }),
  );
  expect(await screen.findByRole('button', { name: 'GitHub CLI · Not connected' })).toBeVisible();
  expect(screen.queryByRole('dialog', { name: 'Welcome to mactions' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Stop' })).toBeEnabled();
});

it('keeps startup read-only while runners load and shows the connected CLI account', async () => {
  localStorage.removeItem('mactions.welcome.v1');
  let finish: (value: Response) => void = () => {};
  fetchMock.mockImplementation((url, options) => {
    if (String(url).startsWith('/api/runners'))
      return new Promise<Response>((resolve) => {
        finish = resolve;
      });
    return Promise.resolve(response(dataFor(url, options)));
  });
  mount();
  expect(screen.getByRole('status', { name: 'Loading runners…' })).toHaveTextContent('');
  expect(screen.getByRole('status', { name: 'Loading filters…' })).toHaveTextContent('');
  expect(await screen.findByText('GitHub CLI · @octocat')).toBeVisible();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  expect(screen.queryByRole('group', { name: 'Filter runners' })).not.toBeInTheDocument();
  expect(screen.queryByRole('grid', { name: 'Runners' })).not.toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  await act(async () => {
    finish(response(snapshot));
  });
  expect(await screen.findByRole('button', { name: 'Add Runner' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'GitHub CLI · @octocat' })).toBeVisible();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('waits for a confirmed disconnection before opening the first-visit dialog', async () => {
  localStorage.removeItem('mactions.welcome.v1');
  let finish: (value: Response) => void = () => {};
  fetchMock.mockImplementation((url, options) => {
    if (String(url) === '/api/github/connection')
      return new Promise<Response>((resolve) => {
        finish = resolve;
      });
    return Promise.resolve(response(dataFor(url, options)));
  });
  mount();
  await openDetails();
  expect(screen.getByRole('button', { name: 'Stop' })).toBeVisible();
  expect(screen.getByRole('status', { name: 'Checking GitHub connection…' })).toBeVisible();
  expect(screen.queryByText('GitHub CLI · Checking…')).not.toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(
    screen.queryByRole('heading', { name: 'Connect GitHub to get started' }),
  ).not.toBeInTheDocument();
  await act(async () => {
    finish(response({ connected: false, message: 'Not logged in' }));
  });
  expect(await screen.findByRole('dialog', { name: 'Welcome to mactions' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'GitHub CLI · Not connected' })).toBeVisible();
});

it('shows an unavailable CLI status without opening setup after a failed connection check', async () => {
  localStorage.removeItem('mactions.welcome.v1');
  fetchMock.mockImplementation(async (url, options) => {
    if (String(url) === '/api/github/connection')
      return response({ error: 'Connection request failed.' }, 503);
    return response(dataFor(url, options));
  });
  mount();
  expect(
    await screen.findByRole('button', { name: 'GitHub CLI · Status unavailable' }),
  ).toBeVisible();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Start GitHub authorization' }),
  ).not.toBeInTheDocument();
});

it('treats an unavailable CLI check separately from being logged out', async () => {
  localStorage.removeItem('mactions.welcome.v1');
  fetchMock.mockImplementation(async (url, options) => {
    if (String(url) === '/api/github/connection')
      return response({
        connected: false,
        state: 'unavailable',
        message: 'GitHub is temporarily unreachable.',
      });
    return response(dataFor(url, options));
  });
  mount();
  expect(
    await screen.findByRole('button', { name: 'GitHub CLI · Status unavailable' }),
  ).toBeVisible();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(
    screen.queryByRole('heading', { name: 'Connect GitHub to get started' }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Start GitHub authorization' }),
  ).not.toBeInTheDocument();
});

it('closes automatic onboarding after GitHub CLI authorization succeeds', async () => {
  localStorage.removeItem('mactions.welcome.v1');
  let connected = false;
  fetchMock.mockImplementation(async (url, options) => {
    if (String(url) === '/api/github/connection') {
      let login: string | undefined;
      let message = 'Not logged in';
      if (connected) {
        login = 'octocat';
        message = 'Connected';
      }
      return response({ connected, login, message });
    }
    return response(dataFor(url, options));
  });
  mount();
  expect(await screen.findByRole('dialog', { name: 'Welcome to mactions' })).toBeVisible();
  connected = true;
  act(() => client.setQueryData(['github-auth'], { status: 'complete', code: null }));
  expect(await screen.findByRole('button', { name: 'GitHub CLI · @octocat' })).toBeVisible();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('offers login and token setup inside the first-visit dialog when disconnected', async () => {
  localStorage.removeItem('mactions.welcome.v1');
  fetchMock.mockImplementation(async (url, options) => {
    if (String(url) === '/api/github/connection')
      return response({ connected: false, message: 'Not logged in' });
    return response(dataFor(url, options));
  });
  mount();
  const user = userEvent.setup();
  const dialog = within(await screen.findByRole('dialog', { name: 'Welcome to mactions' }));
  expect(await dialog.findByRole('button', { name: 'Start GitHub authorization' })).toBeVisible();
  await user.click(dialog.getByRole('button', { name: /^Registration Token/ }));
  expect(dialog.getByText('Some features are limited without a GitHub connection.')).toBeVisible();
  await user.click(dialog.getByRole('button', { name: 'Continue with registration token' }));
  expect(screen.queryByRole('dialog', { name: 'Welcome to mactions' })).not.toBeInTheDocument();
  expect(
    within(screen.getByRole('dialog', { name: 'Add Runner' })).getByLabelText('Repository'),
  ).toBeVisible();
});

it('allows registration token setup even when a local gh account is connected', async () => {
  localStorage.removeItem('mactions.welcome.v1');
  await ready();
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'GitHub CLI · @octocat' }));
  const dialog = within(screen.getByRole('dialog', { name: 'Welcome to mactions' }));
  expect(await dialog.findByText('@octocat')).toBeVisible();
  expect(dialog.getByText(/No additional login is needed/)).toBeVisible();
  expect(dialog.queryByRole('button', { name: 'Connection settings' })).not.toBeInTheDocument();
  expect(dialog.queryByRole('button', { name: 'Check again' })).not.toBeInTheDocument();
  await user.click(dialog.getByRole('button', { name: /^Registration Token/ }));
  expect(dialog.getByText(/does not disconnect an existing GitHub account/)).toBeVisible();
  await user.click(dialog.getByRole('button', { name: /^GitHub CLI/ }));
  expect(await dialog.findByText('@octocat')).toBeVisible();
  await user.click(dialog.getByRole('button', { name: /^Registration Token/ }));
  await user.click(dialog.getByRole('button', { name: 'Continue with registration token' }));
  const create = within(screen.getByRole('dialog', { name: 'Add Runner' }));
  await user.type(create.getByLabelText('Repository'), 'example/build');

  expect(create.getByLabelText('Registration token')).toBeVisible();
});

it('filters repositories by typing and selects with the keyboard', async () => {
  await ready();
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Add Runner' }));
  const dialog = within(screen.getByRole('dialog'));
  await user.click(dialog.getByRole('button', { name: 'Continue to Target' }));
  const input = dialog.getByRole('combobox', { name: 'Repository' });
  await user.type(input, 'missing');
  expect(await dialog.findByText(/No matching options/)).toBeVisible();
  await user.clear(input);
  await user.type(input, 'build');
  expect(await dialog.findByRole('option', { name: /example\/build/ })).toBeVisible();
  await user.keyboard('{ArrowDown}{Enter}');
  expect(dialog.getByText('example/build')).toBeVisible();
  expect(dialog.queryByRole('listbox')).not.toBeInTheDocument();
  expect(dialog.getByRole('button', { name: 'Next' })).toBeEnabled();
});

it('allows editing while another operation is running and explains the wait', async () => {
  await ready();
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Add Runner' }));
  const dialog = within(screen.getByRole('dialog'));
  await chooseRepo(dialog, user);

  act(() => client.setQueryData(RUNNERS_KEY, { ...snapshot, operation_running: true }));
  expect(await dialog.findByText(/Another runner operation is in progress/)).toBeVisible();
  await user.click(dialog.getByText('Advanced settings'));
  expect(dialog.getByLabelText('Name prefix')).toBeEnabled();
  expect(
    dialog.getByRole('status', { name: 'Waiting to create runner…' }).closest('button'),
  ).toBeDisabled();
  act(() => client.setQueryData(RUNNERS_KEY, snapshot));
  expect(await dialog.findByRole('button', { name: 'Next' })).toBeEnabled();
});

it('shows a loading state for creation until the backend finishes', async () => {
  let finish: (value: Response) => void = () => {};
  fetchMock.mockImplementation((url, options) => {
    if (url === '/api/runners' && options?.method === 'POST')
      return new Promise<Response>((resolve) => {
        finish = resolve;
      });
    return Promise.resolve(response(dataFor(url, options)));
  });
  await ready();
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Add Runner' }));
  const dialog = within(screen.getByRole('dialog'));
  await chooseRepo(dialog, user);

  await user.click(dialog.getByText('Advanced settings'));
  await user.click(dialog.getByRole('button', { name: 'Next' }));
  expect(await dialog.findByRole('button', { name: 'Creating & Starting…' })).toBeDisabled();
  expect(dialog.getByText('Setting up your runner')).toBeVisible();
  expect(dialog.queryByText('Creating and starting your runner…')).not.toBeInTheDocument();
  expect(dialog.queryByRole('textbox', { name: 'Name prefix' })).not.toBeInTheDocument();
  expect(dialog.getByText('Creating').closest('li')).toHaveAttribute('aria-current', 'step');
  expect(posts()).toHaveLength(1);
  await act(async () => {
    finish(response({}));
  });
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});

describe('scoped workflow navigation', () => {
  it('keeps list filters visible and loads scope options only when a picker opens', async () => {
    await ready(false);
    const user = userEvent.setup();
    expect(screen.getByRole('region', { name: 'Runner filters' })).toBeVisible();
    expect(screen.getByRole('region', { name: 'Activity scope' })).toBeVisible();
    expect(screen.getByRole('combobox', { name: 'Filter runners' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Filter runner device' })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Search runners' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Filters' })).not.toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(([url]) => String(url).startsWith('/api/github/targets')),
    ).toBe(false);
    await user.click(screen.getByRole('combobox', { name: 'Filter organization' }));
    await screen.findByRole('option', { name: /example.*Organization/ });
    expect(
      fetchMock.mock.calls.some(([url]) => String(url).startsWith('/api/github/targets?kind=org')),
    ).toBe(true);
    expect(
      fetchMock.mock.calls.some(([url]) => String(url).startsWith('/api/github/targets?kind=repo')),
    ).toBe(false);
    expect(requestedActivity('job')).toHaveLength(0);
    expect(requestedActivity('job-logs')).toHaveLength(0);
  });

  it('uses named ancestry for Runner, Run, Job and Step navigation without global detail filters', async () => {
    localStorage.setItem(
      'mactions.navigation.v1',
      JSON.stringify({
        view: 'runners',
        scope: { organization: 'example', repository: 'example/build' },
        runnerSearch: 'build',
      }),
    );
    fetchMock.mockImplementation(async (url, options) => response(activityDataFor(url, options)));
    await ready(false);
    const user = userEvent.setup();
    await user.click(screen.getByRole('row', { name: /build-mac-1/ }));
    expect(screen.getByRole('button', { name: 'Back' })).toHaveTextContent('Back to Runners');
    expect(screen.queryByRole('group', { name: 'Activity view' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Activity scope' })).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Filter runs' })).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Filter organization' })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Filter repository' })).not.toBeInTheDocument();
    await user.click(
      await screen.findByRole('button', { name: 'Open CI run #42 in example/build' }),
    );
    const navigation = within(screen.getByRole('navigation', { name: 'Page navigation' }));
    expect(screen.getByRole('button', { name: 'Back' })).toHaveTextContent('Back to build-mac-1');
    expect(navigation.getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Runners',
      'build-mac-1',
    ]);
    expect(screen.queryByRole('region', { name: 'Run filters' })).not.toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Activity view' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Activity scope' })).not.toBeInTheDocument();
    const tree = within(await screen.findByRole('tree', { name: 'Run jobs and steps' }));
    await user.click(tree.getByRole('treeitem', { name: /Build application/ }));
    const checkout = await tree.findByRole('treeitem', { name: 'Checkout, Success' });
    expect(checkout).toHaveAttribute('aria-level', '2');
    expect(tree.getByRole('treeitem', { name: /Build application/ })).toHaveAttribute(
      'aria-level',
      '1',
    );
    await user.click(checkout);
    expect(await screen.findByRole('region', { name: 'Step 1: Checkout' })).toBeVisible();
    expect(navigation.getByText('Checkout')).toHaveAttribute('aria-current', 'page');
    expect(requestedActivity('job-logs')).toHaveLength(1);
    await user.click(navigation.getByRole('button', { name: 'Build application' }));
    expect(screen.queryByRole('region', { name: 'Step 1: Checkout' })).not.toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Steps in this job' })).toBeVisible();
    const detailReads = requestedActivity('job').length;
    await user.click(
      within(screen.getByRole('article', { name: 'Build application' })).getByRole('button', {
        name: 'Job history',
      }),
    );
    await screen.findByRole('region', { name: 'History for Build application' });
    expect(screen.getByRole('button', { name: 'Back' })).toHaveTextContent('Back to CI #42');
    expect(screen.queryByRole('button', { name: 'Filters' })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Activity view' })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Filter organization' })).not.toBeInTheDocument();
    await user.click(
      within(screen.getByRole('navigation', { name: 'Page navigation' })).getByRole('button', {
        name: 'build-mac-1',
      }),
    );
    expect(
      await screen.findByRole('heading', { name: /^Workflow runs for build-mac-1/ }),
    ).toBeVisible();
    expect(
      screen.queryByRole('region', { name: 'History for Build application' }),
    ).not.toBeInTheDocument();
    await user.click(
      within(screen.getByRole('navigation', { name: 'Page navigation' })).getByRole('button', {
        name: 'Runners',
      }),
    );
    expect(screen.getByRole('searchbox', { name: 'Search runners' })).toHaveValue('build');
    expect(screen.getByRole('region', { name: 'Runner filters' })).toBeVisible();
    expect(JSON.parse(localStorage.getItem('mactions.navigation.v1') || '{}').scope).toEqual({
      organization: 'example',
      repository: 'example/build',
    });
    expect(requestedActivity('job')).toHaveLength(detailReads);
    expect(requestedActivity('job-logs')).toHaveLength(1);
  });

  it('uses local lifecycle reads and refreshes the open Inspector from GitHub inventory', async () => {
    let updated = false;
    fetchMock.mockImplementation(async (url, options) => {
      if (String(url) === '/api/runners?local=1')
        return response({
          ...snapshot,
          runners: [{ ...runner, github_status: 'unknown', github_labels: undefined }],
        });
      if (String(url).startsWith('/api/activity/runners')) {
        let hardware = 'macOS';
        let status = 'online';
        if (updated) {
          hardware = 'ARM64';
          status = 'offline';
        }
        return response({
          runners: [
            {
              github_id: 42,
              local_id: 1,
              name: runner.name,
              status,
              busy: false,
              labels: ['self-hosted', hardware, 'build'],
              github_labels: [
                { name: 'self-hosted', type: 'read-only' },
                { name: hardware, type: 'read-only' },
                { name: 'build', type: 'custom' },
              ],
              host_type: 'self-hosted',
              device: 'this_device',
            },
          ],
          next_page: null,
          message: '',
        });
      }
      return response(dataFor(url, options));
    });
    await ready();
    const panel = within(screen.getByRole('complementary', { name: 'Runner details' }));
    expect(panel.getByText('macOS')).toHaveAttribute('title', 'GitHub default · read-only');
    expect(screen.getByRole('row', { name: 'build-mac-1, Idle, This device' })).toBeVisible();
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/runners')).toBe(false);
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/runners?local=1')).toBe(true);
    updated = true;
    await userEvent.click(screen.getByRole('button', { name: 'Refresh runners' }));
    expect(await panel.findByText('ARM64')).toHaveAttribute('title', 'GitHub default · read-only');
    expect(panel.queryByText('macOS')).not.toBeInTheDocument();
    expect(screen.getByRole('row', { name: 'build-mac-1, offline, This device' })).toBeVisible();
    expect(panel.getByRole('button', { name: 'Stop' })).toBeEnabled();
    await userEvent.click(panel.getByRole('button', { name: 'Edit…' }));
    expect(screen.getByRole('textbox', { name: 'Custom labels' })).toHaveValue('build');
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/runners')).toBe(false);
  });

  it('preserves History result filters and expanded Steps after visiting a historical Run', async () => {
    fetchMock.mockImplementation(async (url, options) => {
      const parsed = new URL(String(url), 'http://localhost');
      if (parsed.pathname === '/api/activity/run' && parsed.searchParams.get('run_id') === '419')
        return response({
          run: {
            ...workflowRun,
            id: 419,
            number: 41,
            title: 'Previous build',
            conclusion: 'failure',
          },
          jobs: [summary(historicalJob)],
        });
      return response(activityDataFor(url, options));
    });
    await ready(false);
    const user = userEvent.setup();
    await user.click(screen.getByRole('row', { name: /build-mac-1/ }));
    await user.click(
      await screen.findByRole('button', { name: 'Open CI run #42 in example/build' }),
    );
    await user.click(
      within(await screen.findByRole('complementary', { name: 'Jobs in this run' })).getByRole(
        'treeitem',
        { name: /Build application/ },
      ),
    );
    await user.click(
      within(await screen.findByRole('article', { name: 'Build application' })).getByRole(
        'button',
        { name: 'Job history' },
      ),
    );
    let history = within(
      await screen.findByRole('region', { name: 'History for Build application' }),
    );
    await history.findByRole('button', { name: 'Expand Build application run #41 attempt 1' });
    await user.click(history.getByRole('combobox', { name: 'Filter by status' }));
    await user.click(screen.getByRole('option', { name: 'Failure' }));
    await user.click(
      history.getByRole('button', { name: 'Expand Build application run #41 attempt 1' }),
    );
    await history.findByRole('table', { name: 'Step results and duration' });
    const detailReads = requestedActivity('job').length;
    await user.click(history.getByRole('button', { name: 'View run' }));
    await screen.findByRole('region', { name: 'Run details for CI #41' });
    expect(
      screen.queryByRole('region', { name: 'History for Build application' }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Back' }));
    history = within(screen.getByRole('region', { name: 'History for Build application' }));
    expect(history.getByText('Failure', { selector: '[class$="singleValue"] span' })).toBeVisible();
    expect(
      history.getByRole('button', { name: 'Expand Build application run #41 attempt 1' }),
    ).toHaveAttribute('aria-expanded', 'true');
    expect(
      history.queryByRole('button', { name: 'Expand Build application run #42 attempt 1' }),
    ).not.toBeInTheDocument();
    expect(
      within(history.getByRole('table', { name: 'Step results and duration' })).getByRole('row', {
        name: 'Compile application Failure 2m 0s',
      }),
    ).toBeVisible();
    expect(requestedActivity('job')).toHaveLength(detailReads);
    expect(requestedActivity('job-logs')).toHaveLength(0);
  });

  it('restores both loaded Run pages after inactive queries expire without waiting for refetch', async () => {
    const olderRun = {
      ...workflowRun,
      id: 419,
      number: 41,
      title: 'Previous build',
      conclusion: 'failure',
    };
    let blockParents = false;
    fetchMock.mockImplementation((url, options) => {
      const parsed = new URL(String(url), 'http://localhost');
      if (blockParents && ['/api/activity/runs', '/api/activity/run'].includes(parsed.pathname)) {
        return new Promise<Response>((_resolve, reject) =>
          options?.signal?.addEventListener(
            'abort',
            () => reject(new DOMException('Aborted', 'AbortError')),
            { once: true },
          ),
        );
      }
      if (parsed.pathname === '/api/activity/runs') {
        const secondPage = parsed.searchParams.get('page') === '2';
        let runs = [workflowRun];
        let nextPage: number | null = 2;
        if (secondPage) {
          runs = [olderRun];
          nextPage = null;
        }
        return Promise.resolve(response({ runs, next_page: nextPage, message: '' }));
      }
      return Promise.resolve(response(activityDataFor(url, options)));
    });
    await ready(false);
    const user = userEvent.setup();
    await user.click(
      within(screen.getByRole('group', { name: 'Activity view' })).getByRole('button', {
        name: 'Runs',
      }),
    );
    await user.click(await screen.findByRole('button', { name: 'Load more runs' }));
    await screen.findByRole('button', { name: 'Open CI run #41 in example/build' });
    await user.click(screen.getByRole('button', { name: 'Open CI run #42 in example/build' }));
    await user.click(
      within(await screen.findByRole('complementary', { name: 'Jobs in this run' })).getByRole(
        'treeitem',
        { name: /Build application/ },
      ),
    );
    await user.click(
      within(await screen.findByRole('article', { name: 'Build application' })).getByRole(
        'button',
        { name: 'Job history' },
      ),
    );
    await screen.findByRole('button', { name: 'Expand Build application run #41 attempt 1' });
    const detailReads = requestedActivity('job').length;
    blockParents = true;
    act(() => {
      client.removeQueries({ queryKey: ['activity-runs'] });
      client.removeQueries({ queryKey: ['activity-run'] });
    });
    expect(client.getQueryData(['activity-runs', '', '', 'all', 'all'])).toBeUndefined();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('article', { name: 'Build application' })).toBeVisible();
    expect(
      within(screen.getByRole('complementary', { name: 'Jobs in this run' })).getByRole(
        'treeitem',
        { name: /Build application/ },
      ),
    ).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('button', { name: 'Open CI run #42 in example/build' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Open CI run #41 in example/build' })).toBeVisible();
    expect(requestedActivity('job')).toHaveLength(detailReads);
    expect(requestedActivity('job-logs')).toHaveLength(0);
  });

  it('refreshes local runner state while GitHub is disconnected', async () => {
    fetchMock.mockImplementation(async (url, options) => {
      if (String(url) === '/api/github/connection')
        return response({ connected: false, message: 'Not logged in' });
      return response(dataFor(url, options));
    });
    mount();
    await screen.findByRole('button', { name: 'GitHub CLI · Not connected' });
    const refresh = await screen.findByRole('button', { name: 'Refresh runners' });
    await waitFor(() => expect(refresh).toBeEnabled());
    const localReads = () =>
      fetchMock.mock.calls.filter(([url]) => url === '/api/runners?local=1').length;
    const before = localReads();
    await userEvent.click(refresh);
    await waitFor(() => expect(localReads()).toBe(before + 1));
    expect(requestedActivity('runners')).toHaveLength(0);
    expect(requestedActivity('work')).toHaveLength(0);
  });

  it('recovers from malformed saved filters without applying an unrelated Repository', async () => {
    localStorage.setItem(
      'mactions.navigation.v1',
      JSON.stringify({
        view: 'unexpected',
        scope: { organization: 'example', repository: 'unrelated/build' },
        runnerStatus: 'invalid',
        runStatus: 'invalid',
        device: 'invalid',
      }),
    );
    await ready(false);
    expect(
      within(screen.getByRole('group', { name: 'Activity view' })).getByRole('button', {
        name: 'Runners',
      }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('All runners')).toBeVisible();
    expect(screen.getByText('All devices')).toBeVisible();
    expect(
      within(screen.getByRole('region', { name: 'Activity scope' })).queryByText('unrelated/build'),
    ).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('mactions.navigation.v1') || '{}')).toMatchObject({
      scope: { organization: 'example', repository: '' },
      runStatus: 'all',
    });
  });

  it('loads only assigned work summaries until opening a Run and selecting a Job', async () => {
    fetchMock.mockImplementation(async (url, options) => response(activityDataFor(url, options)));
    await ready(false);
    const row = within(screen.getByRole('row', { name: /build-mac-1/ }));
    expect(await row.findByText('Build application')).toBeVisible();
    expect(row.queryByText('Run tests')).not.toBeInTheDocument();
    expect(screen.queryByText('Checkout')).not.toBeInTheDocument();
    expect(requestedActivity('job')).toHaveLength(0);
    expect(requestedActivity('run')).toHaveLength(0);
    expect(requestedActivity('job-logs')).toHaveLength(0);

    await userEvent.click(screen.getByRole('row', { name: /build-mac-1/ }));
    await screen.findByRole('heading', { name: /^Workflow runs for build-mac-1/ });
    await waitFor(() =>
      expect(
        requestedActivity('runs').some((url) => url.searchParams.get('runner_id') === '42'),
      ).toBe(true),
    );
    await userEvent.click(
      await screen.findByRole('button', { name: 'Open CI run #42 in example/build' }),
    );
    const jobs = within(await screen.findByRole('complementary', { name: 'Jobs in this run' }));
    const localJob = jobs.getByRole('treeitem', { name: /Build application/ });
    const otherJob = jobs.getByRole('treeitem', { name: /Run tests/ });
    expect(within(localJob).getByText('Selected runner')).toBeVisible();
    expect(otherJob).toHaveAccessibleName(/GitHub-hosted.*Other device/);
    expect(within(otherJob).queryByText('Selected runner')).not.toBeInTheDocument();
    expect(requestedActivity('job')).toHaveLength(0);
    await userEvent.click(localJob);
    const card = await screen.findByRole('article', { name: 'Build application' });
    expect(within(card).getByText('Checkout')).toBeVisible();
    expect(within(card).getByText('2/2 steps completed')).toBeVisible();
    expect(requestedActivity('job')).toHaveLength(1);
    expect(requestedActivity('job-logs')).toHaveLength(0);
    await userEvent.click(within(card).getByRole('button', { name: 'Full job log' }));
    expect(await within(card).findByText('Build finished')).toBeVisible();
    expect(requestedActivity('job-logs')).toHaveLength(1);
  });

  it('opens historical Steps on demand and returns to the selected Job and Runner context', async () => {
    fetchMock.mockImplementation(async (url, options) => response(activityDataFor(url, options)));
    await ready(false);
    const user = userEvent.setup();
    await user.type(screen.getByRole('searchbox', { name: 'Search runners' }), 'build');
    await user.click(screen.getByRole('row', { name: /build-mac-1/ }));
    await user.click(
      await screen.findByRole('button', { name: 'Open CI run #42 in example/build' }),
    );
    const jobs = within(await screen.findByRole('complementary', { name: 'Jobs in this run' }));
    await user.click(jobs.getByRole('treeitem', { name: /Build application/ }));
    const card = await screen.findByRole('article', { name: 'Build application' });
    await user.click(within(card).getByRole('button', { name: 'Job history' }));
    const history = within(
      await screen.findByRole('region', { name: 'History for Build application' }),
    );
    const previous = await history.findByRole('button', {
      name: 'Expand Build application run #41 attempt 1',
    });
    const execution = within(previous.closest('tr')!);
    expect(execution.getByText('Failure')).toBeVisible();
    expect(execution.getByText('2m 0s')).toBeVisible();
    expect(
      history.queryByRole('table', { name: 'Step results and duration' }),
    ).not.toBeInTheDocument();
    expect(requestedActivity('job').some((url) => url.searchParams.get('job_id') === '100')).toBe(
      false,
    );
    expect(requestedActivity('job-history')[0].searchParams.get('workflow_id')).toBe('7');
    expect(requestedActivity('job-history')[0].searchParams.get('job_name')).toBe(
      'Build application',
    );
    await user.click(previous);
    const table = await history.findByRole('table', { name: 'Step results and duration' });
    expect(
      within(table).getByRole('row', { name: 'Compile application Failure 2m 0s' }),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(await screen.findByRole('article', { name: 'Build application' })).toBeVisible();
    expect(
      within(screen.getByRole('complementary', { name: 'Jobs in this run' })).getByRole(
        'treeitem',
        { name: /Build application/ },
      ),
    ).toHaveAttribute('aria-selected', 'true');
    expect(
      within(screen.getByRole('navigation', { name: 'Page navigation' })).getByRole('button', {
        name: 'build-mac-1',
      }),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(
      await screen.findByRole('heading', { name: /^Workflow runs for build-mac-1/ }),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('searchbox', { name: 'Search runners' })).toHaveValue('build');
    expect(screen.getByRole('row', { name: /build-mac-1/ })).toBeVisible();
  });

  it('keeps external Runner details read-only and lets the device filter narrow the list', async () => {
    fetchMock.mockImplementation(async (url, options) => {
      if (String(url).startsWith('/api/activity/runners'))
        return response({ runners: [remoteRunner], next_page: null, message: '' });
      return response(dataFor(url, options));
    });
    await ready(false);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Details for remote-mac' }));
    const panel = within(screen.getByRole('complementary', { name: 'Runner details' }));
    expect(panel.getByText(/management is read-only/)).toBeVisible();
    expect(panel.getByText('Self-hosted')).toBeVisible();
    expect(panel.queryByRole('button', { name: 'Stop' })).not.toBeInTheDocument();
    expect(panel.queryByRole('button', { name: 'Restart' })).not.toBeInTheDocument();
    expect(panel.queryByRole('button', { name: 'Delete Runner…' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /^Workflow runs for remote-mac/ }),
    ).not.toBeInTheDocument();
    await user.click(panel.getByRole('button', { name: 'Close runner details' }));
    expect(screen.getByRole('button', { name: 'Details for remote-mac' })).toHaveFocus();
    fireEvent.contextMenu(screen.getByRole('row', { name: /remote-mac/ }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    await user.click(screen.getByRole('combobox', { name: 'Filter runner device' }));
    await user.click(screen.getByRole('option', { name: 'This device' }));
    expect(screen.queryByRole('row', { name: /remote-mac/ })).not.toBeInTheDocument();
    expect(screen.getByRole('row', { name: /build-mac-1/ })).toBeVisible();
    await user.click(screen.getByRole('combobox', { name: 'Filter runner device' }));
    await user.click(screen.getByRole('option', { name: 'Other devices' }));
    expect(screen.getByRole('row', { name: /remote-mac/ })).toBeVisible();
    expect(screen.queryByRole('row', { name: /build-mac-1/ })).not.toBeInTheDocument();
    expect(posts()).toHaveLength(0);
  });

  it('composes Org and Repo filters, prefills creation, and remembers the last Runs view', async () => {
    fetchMock.mockImplementation(async (url, options) => response(activityDataFor(url, options)));
    const view = mount();
    const user = userEvent.setup();
    await screen.findByRole('button', { name: 'Details for build-mac-1' });
    await screen.findByRole('button', { name: 'GitHub CLI · @octocat' });
    await user.click(screen.getByRole('combobox', { name: 'Filter organization' }));
    await user.click(await screen.findByRole('option', { name: /example.*Organization/ }));
    await user.click(screen.getByRole('combobox', { name: 'Filter repository' }));
    await user.click(await screen.findByRole('option', { name: /example\/build/ }));
    await waitFor(() =>
      expect(
        requestedActivity('work').some(
          (url) =>
            url.searchParams.get('organization') === 'example' &&
            url.searchParams.get('repository') === 'example/build',
        ),
      ).toBe(true),
    );
    await user.click(screen.getByRole('button', { name: 'Add Runner' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Add Runner' }));
    await user.click(dialog.getByRole('button', { name: 'Continue to Target' }));
    expect(dialog.getByText('example/build')).toBeVisible();
    expect(dialog.getByRole('button', { name: 'Next' })).toBeEnabled();
    await user.click(dialog.getByRole('button', { name: 'Cancel' }));
    await user.click(
      within(screen.getByRole('group', { name: 'Activity view' })).getByRole('button', {
        name: 'Runs',
      }),
    );
    await user.type(screen.getByRole('searchbox', { name: 'Search runs' }), 'Build');
    await user.click(screen.getByRole('combobox', { name: 'Filter runs' }));
    await user.click(screen.getByRole('option', { name: 'Success' }));
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem('mactions.navigation.v1') || '{}')).toMatchObject({
        view: 'runs',
        scope: { organization: 'example', repository: 'example/build' },
        runSearch: 'Build',
        runStatus: 'success',
      }),
    );
    view.unmount();
    mount();
    expect(await screen.findByRole('searchbox', { name: 'Search runs' })).toHaveValue('Build');
    expect(screen.getByRole('region', { name: 'Run filters' })).toBeVisible();
    expect(screen.getByText('Success', { selector: '[class$="singleValue"] span' })).toBeVisible();
    expect(
      within(screen.getByRole('group', { name: 'Activity view' })).getByRole('button', {
        name: 'Runs',
      }),
    ).toHaveAttribute('aria-pressed', 'true');
    const scope = within(screen.getByRole('region', { name: 'Activity scope' }));
    expect(scope.getByText('example')).toBeVisible();
    expect(scope.getByText('example/build')).toBeVisible();
  });

  it('clears a repository that does not belong to a newly selected Organization', async () => {
    localStorage.setItem(
      'mactions.navigation.v1',
      JSON.stringify({
        view: 'runners',
        scope: { organization: 'example', repository: 'example/build' },
      }),
    );
    fetchMock.mockImplementation(async (url, options) => {
      if (String(url).startsWith('/api/github/targets?kind=org'))
        return response({
          items: [{ kind: 'org', name: 'another', private: false }],
          next_page: null,
        });
      return response(dataFor(url, options));
    });
    await ready(false);
    const user = userEvent.setup();
    await user.click(screen.getByRole('combobox', { name: 'Filter organization' }));
    await user.click(await screen.findByRole('option', { name: /another.*Organization/ }));
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem('mactions.navigation.v1') || '{}').scope).toEqual({
        organization: 'another',
        repository: '',
      }),
    );
    expect(
      within(screen.getByRole('region', { name: 'Activity scope' })).queryByText('example/build'),
    ).not.toBeInTheDocument();
  });

  it('supports view switching and management when browser storage is unavailable', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage unavailable');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage unavailable');
    });
    await ready(false);
    await userEvent.click(
      within(screen.getByRole('group', { name: 'Activity view' })).getByRole('button', {
        name: 'Runs',
      }),
    );
    expect(await screen.findByRole('heading', { name: /^Workflow runs/ })).toBeVisible();
    await userEvent.click(
      within(screen.getByRole('group', { name: 'Activity view' })).getByRole('button', {
        name: 'Runners',
      }),
    );
    await openDetails();
    expect(screen.getByRole('button', { name: 'Stop' })).toBeEnabled();
  });
});

it('closes the filter menu with Escape while keeping runner details open', async () => {
  mount();
  await openDetails();
  const user = userEvent.setup();
  await user.click(screen.getByRole('combobox', { name: 'Filter runners' }));
  expect(screen.getByRole('listbox')).toBeInTheDocument();
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  expect(screen.getByRole('complementary', { name: 'Runner details' })).toBeVisible();
});

function NavigationRenderProbe({ onRender }: { onRender: () => void }) {
  const { page } = useNavigation();
  onRender();
  return <output aria-label="Current page">{page.type}</output>;
}

function RunnerRenderProbe() {
  const { fleet } = useRunnerWorkspace();
  return <output aria-label="Runner operation">{String(fleet.locked)}</output>;
}

it('keeps runner updates out of navigation consumers', async () => {
  const onRender = vi.fn();
  render(
    <QueryClientProvider client={client}>
      <AppProviders>
        <NavigationRenderProbe onRender={onRender} />
        <RunnerRenderProbe />
      </AppProviders>
    </QueryClientProvider>,
  );
  await waitFor(() => expect(client.getQueryData(RUNNERS_KEY)).toBeDefined());
  const initialRenders = onRender.mock.calls.length;
  await act(async () => {
    client.setQueryData<Snapshot>(RUNNERS_KEY, { ...snapshot, operation_running: true });
  });
  await waitFor(() => expect(screen.getByLabelText('Runner operation')).toHaveTextContent('true'));
  expect(onRender).toHaveBeenCalledTimes(initialRenders);
});
