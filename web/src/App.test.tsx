import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { CONNECTION_KEY } from './GitHubConnection';
import { createQueryClient, RUNNERS_KEY } from './use-runners';
import type { Runner, Snapshot } from './types';

const runner: Runner = {
  id: 1, name: 'build-mac-1', target: { kind: 'repo', name: 'example/build' },
  labels: ['build'], path: '/managed/actions-runner-1', version: '2.999.0', github_id: 42,
  enabled: true, phase: 'ready', error: null, deregistered: false, registration_attempted: true,
  local_status: 'running', github_status: 'online', busy: false, interrupted: false,
  github_labels: [{ name: 'self-hosted', type: 'read-only' }, { name: 'build', type: 'custom' }],
};
const snapshot: Snapshot = { runners: [runner], operation_running: false, data_directory: '/managed' };
const fetchMock = vi.fn<typeof fetch>();
let client: ReturnType<typeof createQueryClient>;
function response(data: unknown, status = 200) { return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } }); }
const posts = () => fetchMock.mock.calls.filter(([url, options]) => options?.method === 'POST' && String(url).startsWith('/api/runners'));
const capabilities = { local: { state: 'available' }, runner_status: { state: 'available' }, jobs: { state: 'available' }, manage: { state: 'unknown' }, links: [] };
function dataFor(url: RequestInfo | URL, options?: RequestInit): unknown {
  const path = String(url);
  if (path === '/api/github/connection') return { connected: true, login: 'octocat', message: 'Connected' };
  if (path === '/api/github/auth') return { status: 'idle', code: null, url: 'https://github.com/login/device' };
  if (path.startsWith('/api/github/targets')) return { items: path.includes('kind=org') ? [{ kind: 'org', name: 'example', private: false }] : [{ kind: 'repo', name: 'example/build', private: true }], next_page: null };
  if (path === '/api/github/check' || path.endsWith('/capabilities')) return capabilities;
  if (path.includes('/logs')) return { files: [], content: '', selected: null, truncated: false, total_bytes: 0 };
  if (path.includes('/jobs')) return { jobs: [], message: 'Only assigned jobs.' };
  return options?.method === 'POST' ? {} : snapshot;
}

beforeEach(() => {
  localStorage.setItem('mactions.welcome.v1', 'seen');
  client = createQueryClient();
  fetchMock.mockReset().mockImplementation(async (url, options) => response(dataFor(url, options)));
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => { client.clear(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
function mount() { return render(<QueryClientProvider client={client}><App/></QueryClientProvider>); }
async function ready() { mount(); await screen.findByRole('button', { name: 'Stop' }); await screen.findByRole('button', { name: 'GitHub CLI · @octocat' }); }
async function chooseRepo(dialog: ReturnType<typeof within>, user: ReturnType<typeof userEvent.setup>) {
  await user.click(dialog.getByRole('button', { name: 'Continue to Target' }));
  await user.click(dialog.getByRole('combobox', { name: 'Repository' }));
  await user.click(await dialog.findByRole('option', { name: /example\/build/ }));
}

describe('runner management UI', () => {
  it('keeps execution tabs below and loads access only from the inspector', async () => {
    await ready();
    const activity = within(screen.getByRole('group', { name: 'Runner activity view' }));
    expect(activity.getAllByRole('button').map(button => button.textContent)).toEqual(['Jobs', 'Logs']);
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
    const second = { ...runner, id: 2, name: 'second-mac', target: { kind: 'repo' as const, name: 'example/second' } };
    fetchMock.mockImplementation(async (url, options) => response(String(url).startsWith('/api/runners') && !String(url).endsWith('/capabilities') && !String(url).includes('/logs')
      ? { ...snapshot, runners: [runner, second] } : dataFor(url, options)));
    await ready();
    await userEvent.click(screen.getByText('GitHub access'));
    await screen.findByText('Runner management');
    await userEvent.click(screen.getByRole('row', { name: /second-mac/ }));
    const summary = screen.getByText('GitHub access');
    expect(summary.closest('details')).not.toHaveAttribute('open');
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/runners/2/capabilities')).toBe(false);
    await userEvent.click(summary);
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => url === '/api/runners/2/capabilities')).toBe(true));
  });

  it('shows a single concise empty jobs state', async () => {
    await ready();
    await userEvent.click(screen.getByRole('button', { name: 'Jobs' }));
    expect(await screen.findByText('No jobs found.')).toBeVisible();
    expect(screen.queryByText('Only assigned jobs.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh jobs' })).toBeVisible();
  });

  it('opens job details only on request and preserves step disclosure across refreshes', async () => {
    const active = { id: 101, name: 'Build application', status: 'in_progress', conclusion: null, workflow: 'CI', branch: 'main', run_number: 42, url: 'https://github.com/example/build/actions/runs/42/job/101', started_at: '2026-09-29T10:00:00Z', completed_at: null, steps: [
      { number: 1, name: 'Checkout', status: 'completed', conclusion: 'success' },
      { number: 2, name: 'Compile application', status: 'in_progress', conclusion: null },
      { number: 3, name: 'Upload artifacts', status: 'queued', conclusion: null },
    ] };
    const recent = { ...active, id: 100, name: 'Previous build', status: 'completed', conclusion: 'failure', steps: [{ number: 1, name: 'Compile application', status: 'completed', conclusion: 'failure' }] };
    let currentJob = active;
    fetchMock.mockImplementation(async (url, options) => response(String(url).includes('/jobs') ? { jobs: [recent, currentJob], message: 'Recent assigned jobs.' } : String(url) === '/api/runners' ? { ...snapshot, runners: [{ ...runner, busy: true }] } : dataFor(url, options)));
    await ready();
    const jobToggle = await screen.findByRole('button', { name: /Build application, Running/ });
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    expect(screen.queryByText('Upload artifacts')).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/job-logs'))).toBe(false);
    expect(jobToggle).toHaveAttribute('aria-expanded', 'false');
    jobToggle.focus();
    await userEvent.keyboard('{Enter}');
    const card = await screen.findByRole('article', { name: 'Build application' });
    expect(jobToggle).toHaveAttribute('aria-expanded', 'true');
    expect(jobToggle).toHaveAttribute('aria-controls', card.id);
    expect(screen.getAllByRole('article').map(item => item.getAttribute('aria-label'))).toEqual(['Build application']);
    expect(screen.getByRole('region', { name: 'Workflow graph' })).toBeVisible();
    expect(within(card).getByText('Upload artifacts')).toBeVisible();
    expect(within(card).getByRole('progressbar')).toHaveAttribute('value', '1');
    const toggle = within(card).getByRole('button', { name: /Compile application/ });
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    currentJob = { ...active, steps: active.steps.map(step => step.number === 2 ? { ...step, status: 'completed', conclusion: 'success' } : step) };
    await userEvent.click(screen.getByRole('button', { name: 'Refresh jobs' }));
    await waitFor(() => expect(within(card).getByRole('progressbar')).toHaveAttribute('value', '2'));
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(screen.getByRole('button', { name: /Previous build, Failure/ }));
    expect(screen.getByRole('article', { name: 'Previous build' })).toBeVisible();
    expect(screen.queryByRole('article', { name: 'Build application' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Previous build, Failure/ }));
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Previous build, Failure/ })).toHaveAttribute('aria-expanded', 'false');
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

  it('resizes the panes during a captured pointer drag', async () => {
    await ready();
    const pane = screen.getByRole('region', { name: 'Managed runners' });
    vi.spyOn(pane, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 100, 800, 600));
    const divider = screen.getByRole('separator', { name: 'Resize terminal' });
    const capture = vi.fn();
    const release = vi.fn();
    divider.setPointerCapture = capture;
    divider.hasPointerCapture = () => true;
    divider.releasePointerCapture = release;
    fireEvent.pointerDown(divider, { pointerId: 1 });
    fireEvent.pointerMove(divider, { pointerId: 1, clientY: 400 });
    expect(divider).toHaveAttribute('aria-valuenow', '50');
    fireEvent.pointerUp(divider, { pointerId: 1 });
    expect(capture).toHaveBeenCalled();
    expect(release).toHaveBeenCalled();
  });

  it('allows keyboard resizing within pane limits', async () => {
    await ready();
    const divider = screen.getByRole('separator', { name: 'Resize terminal' });
    expect(divider).toHaveAttribute('aria-valuenow', '42');
    fireEvent.keyDown(divider, { key: 'ArrowDown' });
    expect(divider).toHaveAttribute('aria-valuenow', '47');
    fireEvent.keyDown(divider, { key: 'End' });
    fireEvent.keyDown(divider, { key: 'ArrowDown' });
    expect(divider).toHaveAttribute('aria-valuenow', '75');
    fireEvent.keyDown(divider, { key: 'Home' });
    fireEvent.keyDown(divider, { key: 'ArrowUp' });
    expect(divider).toHaveAttribute('aria-valuenow', '20');
  });

  it('searches labels and navigates rows without losing keyboard focus', async () => {
    client.setQueryData(RUNNERS_KEY, { ...snapshot, runners: [runner, { ...runner, id: 2, name: 'second-mac' }] });
    mount();
    const row = screen.getByRole('row', { name: /build-mac-1/ });
    row.focus();
    fireEvent.keyDown(row, { key: 'ArrowDown' });
    expect(screen.getByRole('row', { name: /second-mac/ })).toHaveFocus();
    const user = userEvent.setup();
    await user.type(screen.getByRole('searchbox'), 'missing');
    expect(screen.getByText('No Matching Runners')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Show All Runners' }));
    expect(screen.getByRole('searchbox')).toHaveFocus();
    expect(screen.getByRole('row', { name: /build-mac-1/ })).toBeVisible();
  });

  it('keeps an edited form and its focus during background snapshot updates', async () => {
    await ready();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Edit…' }));
    const input = screen.getByRole('textbox', { name: 'Custom labels' });
    await user.clear(input); await user.type(input, 'release');
    act(() => client.setQueryData(RUNNERS_KEY, { ...snapshot, runners: [{ ...runner, busy: true }] }));
    expect(input).toHaveValue('release'); expect(input).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Save labels' }));
    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(posts()[0][0]).toBe('/api/runners/1/labels');
    expect(JSON.parse(String(posts()[0][1]?.body))).toEqual({ labels: ['release'] });
  });

  it('clears only custom labels and never sends the read-only defaults', async () => {
    await ready(); const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Edit…' }));
    expect(screen.getByRole('textbox', { name: 'Custom labels' })).toHaveValue('build');
    await user.clear(screen.getByRole('textbox', { name: 'Custom labels' }));
    await user.click(screen.getByRole('button', { name: 'Save labels' }));
    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(JSON.parse(String(posts()[0][1]?.body))).toEqual({ labels: [] });
  });

  it('requires explicit delete confirmation and sends the original runner identity', async () => {
    await ready(); const user = userEvent.setup();
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
    await ready(); const user = userEvent.setup();
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
    await ready(); const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Add Runner' }));
    const dialog = within(screen.getByRole('dialog'));
    await user.click(dialog.getByRole('button', { name: 'Continue to Target' }));
    await user.click(dialog.getByRole('button', { name: /^Organization:/ }));
    await user.click(dialog.getByRole('combobox', { name: 'Organization' }));
    await user.click(await dialog.findByRole('option', { name: /example.*Organization/ }));

    await user.click(dialog.getByText('Advanced settings'));
    await user.clear(dialog.getByLabelText('Name prefix')); await user.type(dialog.getByLabelText('Name prefix'), 'studio');
    await user.type(dialog.getByLabelText('Custom labels'), 'build, release');
    expect(dialog.getByRole('button', { name: 'Next' })).toBeEnabled();
    await user.click(dialog.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(JSON.parse(String(posts()[0][1]?.body))).toEqual({ kind: 'org', target: 'example', prefix: 'studio', labels: ['build', 'release'] });
    expect(posts()[0][1]?.headers).toEqual({ 'Content-Type': 'application/json', 'X-Mactions': '1' });
  });

  it('does not retry failed mutations or claim that a failed stop succeeded', async () => {
    fetchMock.mockImplementation(async (url, options) => response(options?.method === 'POST' ? { error: 'Runner processes have not exited.' } : dataFor(url, options), options?.method === 'POST' ? 400 : 200));
    await ready(); const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Stop' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Stop' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Runner processes have not exited.');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Stop' })).toBeEnabled());
    expect(posts()).toHaveLength(1);
  });
});



it('uses a searchable select and clears the repository when switching scope', async () => {
  await ready(); const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Add Runner' }));
  const dialog = within(screen.getByRole('dialog'));
  expect(dialog.queryByRole('combobox')).not.toBeInTheDocument();
  expect(fetchMock.mock.calls.some(([url]) => String(url).startsWith('/api/github/targets'))).toBe(false);
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
  await ready(); const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Add Runner' }));
  const dialog = within(screen.getByRole('dialog'));
  await chooseRepo(dialog, user);

  await user.click(dialog.getByText('Advanced settings'));
  await user.clear(dialog.getByLabelText('Name prefix')); await user.type(dialog.getByLabelText('Name prefix'), 'studio');
  await user.click(dialog.getByRole('button', { name: 'Back' }));
  expect(dialog.getByRole('group', { name: 'Registration method' })).toBeVisible();
  await user.click(dialog.getByRole('button', { name: 'Continue to Target' }));

  await user.click(dialog.getByText('Advanced settings'));
  expect(dialog.getByLabelText('Name prefix')).toHaveValue('studio');
  expect(dialog.getByText('example/build')).toBeVisible();
});

it('accepts GitHub URLs in registration token mode', async () => {
  await ready(); const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Add Runner' }));
  const dialog = within(screen.getByRole('dialog'));
  await user.click(dialog.getByRole('button', { name: /^Registration Token:/ }));
  await user.click(dialog.getByRole('button', { name: 'Continue to Target' }));
  await user.type(dialog.getByLabelText('Repository'), 'https://github.com/example/build');

  await user.type(dialog.getByLabelText('Registration token'), 'fixture-token');
  expect(dialog.getByRole('button', { name: 'Next' })).toBeEnabled();
  await user.click(dialog.getByRole('button', { name: 'Next' }));
  await waitFor(() => expect(posts()).toHaveLength(1));
  expect(JSON.parse(String(posts()[0][1]?.body))).toMatchObject({ kind: 'repo', target: 'example/build' });
});

it('rejects a repository URL while organization scope is selected', async () => {
  await ready(); const user = userEvent.setup();
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
  fetchMock.mockImplementation(async (url, options) => response(String(url) === '/api/github/connection' ? { connected: false, message: 'Not logged in' } : dataFor(url, options)));
  mount(); const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: 'Add Runner' }));
  const dialog = within(screen.getByRole('dialog'));
  await user.click(dialog.getByRole('button', { name: /^Registration Token:/ }));
  await user.click(dialog.getByRole('button', { name: 'Continue to Target' }));
  await user.type(dialog.getByLabelText('Repository'), 'https://github.com/example/build');

  await user.type(dialog.getByLabelText('Registration token'), 'fixture-token');
  await user.click(dialog.getByRole('button', { name: 'Next' }));
  await waitFor(() => expect(posts()).toHaveLength(1));
  expect(JSON.parse(String(posts()[0][1]?.body))).toMatchObject({ kind: 'repo', target: 'example/build', registration_token: 'fixture-token' });
  expect(fetchMock.mock.calls.some(([url]) => url === '/api/github/check')).toBe(false);
});

it('keeps the target after registration needs SSO and allows retry', async () => {
  let authorized = false;
  fetchMock.mockImplementation(async (url, options) => response(url === '/api/runners' && options?.method === 'POST' && !authorized ? { error: 'GitHub requires SSO authorization.' } : dataFor(url, options), url === '/api/runners' && options?.method === 'POST' && !authorized ? 400 : 200));
  await ready(); const user = userEvent.setup();
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
  fetchMock.mockImplementation(async (url, options) => response(String(url) === '/api/github/connection' ? { connected: false, message: 'Not logged in' } : String(url).includes('/logs') ? { files: [{ name: '_diag/Runner_1.log', bytes: 12 }], selected: '_diag/Runner_1.log', content: 'Listening for Jobs', truncated: false, total_bytes: 12 } : dataFor(url, options)));
  mount();
  expect(await screen.findByText('Listening for Jobs')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Stop' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Restart' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Delete Runner…' })).toBeDisabled();
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Pause live updates' }));
  expect(screen.getByRole('button', { name: 'Resume live updates' })).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Jobs' }));
  expect(screen.getByText(/Connect GitHub above to view jobs/)).toBeVisible();
  expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/jobs'))).toBe(false);
});

it('shows a device code and a browser link without depending on the host browser', async () => {
  let started = false;
  fetchMock.mockImplementation(async (url, options) => {
    if (url === '/api/github/connection') return response({ connected: false, message: 'Not logged in' });
    if (url === '/api/github/auth') {
      if (options?.method === 'POST') started = true;
      return response({ status: started ? 'pending' : 'idle', code: started ? 'ABCD-1234' : null, url: 'https://github.com/login/device' });
    }
    return response(dataFor(url, options));
  });
  mount(); const user = userEvent.setup();
  expect(await screen.findByRole('heading', { name: 'Connect GitHub to get started' })).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Start GitHub authorization' }));
  expect(await screen.findByText('ABCD-1234')).toBeVisible();
  expect(screen.getByRole('link', { name: 'Open GitHub ↗' })).toHaveAttribute('href', 'https://github.com/login/device');
  expect(screen.getByRole('link', { name: 'Open GitHub ↗' })).toHaveAttribute('target', '_blank');
});

it('keeps a creation form after a denied registration and provides authorization controls', async () => {
  fetchMock.mockImplementation(async (url, options) => url === '/api/runners' && options?.method === 'POST' ? response({ error: 'Organization approval is required.' }, 400) : response(dataFor(url, options)));
  await ready(); const user = userEvent.setup();
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
  expect(screen.queryByRole('heading', { name: 'Connect GitHub to get started' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Start GitHub authorization' })).not.toBeInTheDocument();
  expect(fetchMock.mock.calls.some(([url, options]) => url === '/api/github/auth' && options?.method === 'POST')).toBe(false);
});

it('guides disconnected users immediately and lets them keep using local controls', async () => {
  fetchMock.mockImplementation(async (url, options) => response(String(url) === '/api/github/connection' ? { connected: false, message: 'Not logged in' } : dataFor(url, options)));
  mount(); const user = userEvent.setup();
  expect(await screen.findByRole('heading', { name: 'Connect GitHub to get started' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Start GitHub authorization' })).toBeVisible();
  await user.click(screen.getByText('Prefer the terminal?'));
  expect(screen.getByText('gh auth login --hostname github.com --web')).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Continue with local controls' }));
  expect(screen.queryByRole('heading', { name: 'Connect GitHub to get started' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Stop' })).toBeEnabled();
  await user.click(screen.getByRole('button', { name: 'Connect GitHub' }));
  expect(screen.getByRole('button', { name: 'Start GitHub authorization' })).toBeVisible();
});

it('opens the registration token path directly from the connection guide', async () => {
  fetchMock.mockImplementation(async (url, options) => response(String(url) === '/api/github/connection' ? { connected: false, message: 'Not logged in' } : dataFor(url, options)));
  mount(); const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: 'Use a registration token instead' }));
  const dialog = within(screen.getByRole('dialog'));
  await user.type(dialog.getByLabelText('Repository'), 'example/build');

  await user.type(dialog.getByLabelText('Registration token'), 'fixture-token');
  await user.click(dialog.getByRole('button', { name: 'Next' }));
  await waitFor(() => expect(posts()).toHaveLength(1));
  expect(JSON.parse(String(posts()[0][1]?.body))).toMatchObject({ registration_token: 'fixture-token' });
});

it('collapses login guidance when authorization completes and refreshes the account', async () => {
  let connected = false;
  fetchMock.mockImplementation(async (url, options) => response(String(url) === '/api/github/connection' ? { connected, login: connected ? 'octocat' : null } : dataFor(url, options)));
  mount();
  expect(await screen.findByRole('heading', { name: 'Connect GitHub to get started' })).toBeVisible();
  connected = true;
  act(() => client.setQueryData(['github-auth'], { status: 'complete', code: null }));
  expect(await screen.findByRole('button', { name: 'GitHub CLI · @octocat' })).toBeVisible();
  expect(screen.queryByRole('heading', { name: 'Connect GitHub to get started' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Authorize GitHub again' })).not.toBeInTheDocument();
});


it('reuses the GitHub CLI login on a fresh visit without opening setup', async () => {
  localStorage.removeItem('mactions.welcome.v1');
  const view = mount(); const user = userEvent.setup();
  expect(await screen.findByRole('button', { name: 'GitHub CLI · @octocat' })).toBeVisible();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Start GitHub authorization' })).not.toBeInTheDocument();
  expect(fetchMock.mock.calls.some(([url, options]) => url === '/api/github/auth' && options?.method === 'POST')).toBe(false);
  view.unmount(); mount();
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
  act(() => client.setQueryData(CONNECTION_KEY, { connected: false, state: 'disconnected', message: 'Not logged in' }));
  expect(await screen.findByRole('button', { name: 'GitHub CLI · Not connected' })).toBeVisible();
  expect(screen.queryByRole('dialog', { name: 'Welcome to mactions' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Stop' })).toBeEnabled();
});

it('keeps startup read-only while runners load and shows the connected CLI account', async () => {
  localStorage.removeItem('mactions.welcome.v1');
  let finish: (value: Response) => void = () => {};
  fetchMock.mockImplementation((url, options) => String(url).startsWith('/api/runners')
    ? new Promise<Response>(resolve => { finish = resolve; }) : Promise.resolve(response(dataFor(url, options))));
  mount();
  expect(screen.getByRole('status')).toHaveTextContent('Loading runners…');
  expect(await screen.findByText('GitHub CLI · @octocat')).toBeVisible();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  expect(screen.queryByRole('group', { name: 'Filter runners' })).not.toBeInTheDocument();
  expect(screen.queryByRole('grid', { name: 'Runners' })).not.toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  await act(async () => { finish(response(snapshot)); });
  expect(await screen.findByRole('button', { name: 'Add Runner' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'GitHub CLI · @octocat' })).toBeVisible();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('waits for a confirmed disconnection before opening the first-visit dialog', async () => {
  localStorage.removeItem('mactions.welcome.v1');
  let finish: (value: Response) => void = () => {};
  fetchMock.mockImplementation((url, options) => String(url) === '/api/github/connection'
    ? new Promise<Response>(resolve => { finish = resolve; }) : Promise.resolve(response(dataFor(url, options))));
  mount();
  expect(await screen.findByRole('button', { name: 'Stop' })).toBeVisible();
  expect(screen.getByText('GitHub CLI · Checking…')).toBeVisible();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Connect GitHub to get started' })).not.toBeInTheDocument();
  await act(async () => { finish(response({ connected: false, message: 'Not logged in' })); });
  expect(await screen.findByRole('dialog', { name: 'Welcome to mactions' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'GitHub CLI · Not connected' })).toBeVisible();
});

it('shows an unavailable CLI status without opening setup after a failed connection check', async () => {
  localStorage.removeItem('mactions.welcome.v1');
  fetchMock.mockImplementation(async (url, options) => String(url) === '/api/github/connection'
    ? response({ error: 'Connection request failed.' }, 503) : response(dataFor(url, options)));
  mount();
  expect(await screen.findByRole('button', { name: 'GitHub CLI · Status unavailable' })).toBeVisible();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Start GitHub authorization' })).not.toBeInTheDocument();
});

it('treats an unavailable CLI check separately from being logged out', async () => {
  localStorage.removeItem('mactions.welcome.v1');
  fetchMock.mockImplementation(async (url, options) => response(String(url) === '/api/github/connection'
    ? { connected: false, state: 'unavailable', message: 'GitHub is temporarily unreachable.' } : dataFor(url, options)));
  mount();
  expect(await screen.findByRole('button', { name: 'GitHub CLI · Status unavailable' })).toBeVisible();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Connect GitHub to get started' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Start GitHub authorization' })).not.toBeInTheDocument();
});

it('closes automatic onboarding after GitHub CLI authorization succeeds', async () => {
  localStorage.removeItem('mactions.welcome.v1');
  let connected = false;
  fetchMock.mockImplementation(async (url, options) => response(String(url) === '/api/github/connection'
    ? { connected, login: connected ? 'octocat' : undefined, message: connected ? 'Connected' : 'Not logged in' } : dataFor(url, options)));
  mount();
  expect(await screen.findByRole('dialog', { name: 'Welcome to mactions' })).toBeVisible();
  connected = true;
  act(() => client.setQueryData(['github-auth'], { status: 'complete', code: null }));
  expect(await screen.findByRole('button', { name: 'GitHub CLI · @octocat' })).toBeVisible();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('offers login and token setup inside the first-visit dialog when disconnected', async () => {
  localStorage.removeItem('mactions.welcome.v1');
  fetchMock.mockImplementation(async (url, options) => response(String(url) === '/api/github/connection' ? { connected: false, message: 'Not logged in' } : dataFor(url, options)));
  mount(); const user = userEvent.setup();
  const dialog = within(await screen.findByRole('dialog', { name: 'Welcome to mactions' }));
  expect(await dialog.findByRole('button', { name: 'Start GitHub authorization' })).toBeVisible();
  await user.click(dialog.getByRole('button', { name: /^Registration Token/ }));
  expect(dialog.getByText('Some features are limited without a GitHub connection.')).toBeVisible();
  await user.click(dialog.getByRole('button', { name: 'Continue with registration token' }));
  expect(screen.queryByRole('dialog', { name: 'Welcome to mactions' })).not.toBeInTheDocument();
  expect(within(screen.getByRole('dialog', { name: 'Add Runner' })).getByLabelText('Repository')).toBeVisible();
});


it('allows registration token setup even when a local gh account is connected', async () => {
  localStorage.removeItem('mactions.welcome.v1');
  await ready(); const user = userEvent.setup();
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
  await ready(); const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Add Runner' }));
  const dialog = within(screen.getByRole('dialog'));
  await user.click(dialog.getByRole('button', { name: 'Continue to Target' }));
  const input = dialog.getByRole('combobox', { name: 'Repository' });
  await user.type(input, 'missing');
  expect(await dialog.findByText(/No matching loaded targets/)).toBeVisible();
  await user.clear(input);
  await user.type(input, 'build');
  expect(await dialog.findByRole('option', { name: /example\/build/ })).toBeVisible();
  await user.keyboard('{ArrowDown}{Enter}');
  expect(dialog.getByText('example/build')).toBeVisible();
  expect(dialog.queryByRole('listbox')).not.toBeInTheDocument();
  expect(dialog.getByRole('button', { name: 'Next' })).toBeEnabled();
});

it('allows editing while another operation is running and explains the wait', async () => {
  await ready(); const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Add Runner' }));
  const dialog = within(screen.getByRole('dialog'));
  await chooseRepo(dialog, user);

  act(() => client.setQueryData(RUNNERS_KEY, { ...snapshot, operation_running: true }));
  expect(await dialog.findByRole('status')).toHaveTextContent('Another runner operation is in progress');
  await user.click(dialog.getByText('Advanced settings'));
  expect(dialog.getByLabelText('Name prefix')).toBeEnabled();
  expect(dialog.getByRole('button', { name: 'Please wait…' })).toBeDisabled();
  act(() => client.setQueryData(RUNNERS_KEY, snapshot));
  expect(await dialog.findByRole('button', { name: 'Next' })).toBeEnabled();
});

it('shows a loading state for creation until the backend finishes', async () => {
  let finish: (value: Response) => void = () => {};
  fetchMock.mockImplementation((url, options) => url === '/api/runners' && options?.method === 'POST'
    ? new Promise<Response>(resolve => { finish = resolve; }) : Promise.resolve(response(dataFor(url, options))));
  await ready(); const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Add Runner' }));
  const dialog = within(screen.getByRole('dialog'));
  await chooseRepo(dialog, user);

  await user.click(dialog.getByText('Advanced settings'));
  await user.click(dialog.getByRole('button', { name: 'Next' }));
  expect(await dialog.findByRole('button', { name: 'Creating & Starting…' })).toBeDisabled();
  expect(dialog.getByRole('status')).toHaveTextContent('Setting up your runner');
  expect(dialog.queryByRole('textbox', { name: 'Name prefix' })).not.toBeInTheDocument();
  expect(dialog.getByText('Creating').closest('li')).toHaveAttribute('aria-current', 'step');
  expect(posts()).toHaveLength(1);
  await act(async () => { finish(response({})); });
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});
