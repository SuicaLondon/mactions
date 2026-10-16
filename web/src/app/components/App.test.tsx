import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Profiler } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useRunnerOperationLocked } from '../../features/runners/data/hooks/use-runner-operation-locked';
import { useRunnerPolling } from '../../features/runners/data/hooks/use-runner-polling';
import { RUNNERS_KEY } from '../../features/runners/data/models/runner-snapshot-query';
import {
  client,
  disconnectedAnswer,
  gate,
  mount,
  openDetails,
  postBody,
  posts,
  ready,
  remoteRunner,
  requested,
  response,
  runner,
  serve,
  setupAppTests,
  snapshot,
} from '../../test/app-harness';
import { AppNavigation } from '../navigation/components/AppNavigation';
import { startAppSession } from '../session/start-app-session';

setupAppTests();

type User = ReturnType<typeof userEvent.setup>;

async function openCreate(user: User) {
  await user.click(screen.getByRole('button', { name: 'Add runner' }));
  return within(screen.getByRole('dialog'));
}

async function chooseRepo(dialog: ReturnType<typeof within>, user: User) {
  await user.click(dialog.getByRole('button', { name: 'Continue to target' }));
  await user.click(dialog.getByRole('combobox', { name: 'Repository' }));
  await user.click(await dialog.findByRole('option', { name: /example\/build/ }));
}

async function chooseTokenRepo(dialog: ReturnType<typeof within>, user: User) {
  await user.click(dialog.getByRole('button', { name: /^Registration token:/ }));
  await user.click(dialog.getByRole('button', { name: 'Continue to target' }));
}

describe('runner details and actions', () => {
  it('loads GitHub access on demand and resets it for another runner', async () => {
    const second = {
      ...runner,
      id: 2,
      name: 'second-mac',
      target: { kind: 'repo' as const, name: 'example/second' },
    };
    serve((path) => {
      if (
        path.startsWith('/api/runners') &&
        !path.endsWith('/capabilities') &&
        !path.includes('/logs')
      )
        return response({ ...snapshot, runners: [runner, second] });
    });
    await ready(false);
    expect(screen.queryByRole('complementary', { name: 'Runner details' })).not.toBeInTheDocument();
    await openDetails();
    const access = screen.getByText('GitHub access');
    expect(access.closest('details')).not.toHaveAttribute('open');
    expect(requested((url) => url.endsWith('/capabilities'))).toBe(false);
    await userEvent.click(access);
    expect(await screen.findByText('Runner management')).toBeVisible();
    expect(requested((url) => url === '/api/runners/1/capabilities')).toBe(true);

    await openDetails('second-mac');
    expect(screen.getByText('GitHub access').closest('details')).not.toHaveAttribute('open');
    expect(requested((url) => url === '/api/runners/2/capabilities')).toBe(false);
    await userEvent.click(screen.getByText('GitHub access'));
    await waitFor(() =>
      expect(requested((url) => url === '/api/runners/2/capabilities')).toBe(true),
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
    await userEvent.click(screen.getByRole('menuitem', { name: 'Delete runner…' }));
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

  it('keeps an edited label form through background updates and sends only custom labels', async () => {
    await ready();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Edit…' }));
    const input = screen.getByRole('textbox', { name: 'Custom labels' });
    expect(input).toHaveValue('build');
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
    expect(postBody()).toEqual({ labels: ['release'] });
  });

  it('requires explicit delete confirmation and sends the original runner identity', async () => {
    await ready();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Delete runner…' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(posts()).toHaveLength(0);
    await user.click(screen.getByRole('button', { name: 'Delete runner…' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(posts()[0][0]).toBe('/api/runners/1/delete');
    expect(postBody()).toEqual({ confirm: true });
  });

  it('does not retry failed mutations or claim that a failed stop succeeded', async () => {
    serve((_path, options) => {
      if (options?.method === 'POST')
        return response({ error: 'Runner processes have not exited.' }, 400);
    });
    await ready();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Stop' }));
    const dialog = within(screen.getByRole('dialog'));
    await user.click(dialog.getByRole('button', { name: 'Stop' }));
    expect(await dialog.findByRole('alert')).toHaveTextContent('Runner processes have not exited.');
    expect(screen.queryByRole('status', { name: 'Runner operation finished' })).toBeNull();
    await waitFor(() => expect(dialog.getByRole('button', { name: 'Stop' })).toBeEnabled());
    expect(posts()).toHaveLength(1);
    await user.click(dialog.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps the action dialog and its entries until the operation succeeds', async () => {
    const post = gate();
    serve((_path, options) => {
      if (options?.method === 'POST') return post.next();
    });
    await ready();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Edit…' }));
    const dialog = within(screen.getByRole('dialog'));
    const input = dialog.getByRole('textbox', { name: 'Custom labels' });
    await user.clear(input);
    await user.type(input, 'release');
    await user.click(dialog.getByRole('button', { name: 'Save labels' }));
    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(dialog.getByRole('button', { name: 'Save labels' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
    expect(dialog.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(input).toHaveValue('release');
    expect(screen.getByRole('status', { name: 'Runner operation in progress' })).toHaveTextContent(
      'Updating labels for build-mac-1…',
    );
    await act(async () => post.release(response({})));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('status', { name: 'Runner operation finished' })).toHaveTextContent(
      'Labels for build-mac-1 saved.',
    );
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('status', { name: 'Runner operation finished' })).toBeNull();
  });

  it('shows Start progress inside the button and failures in a dismissible alert', async () => {
    const post = gate();
    const stopped = { ...snapshot, runners: [{ ...runner, local_status: 'stopped' }] };
    serve((path, options) => {
      if (options?.method === 'POST') return post.next();
      if (path.startsWith('/api/runners')) return response(stopped);
    });
    await ready();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Start' }));
    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(screen.getByRole('button', { name: 'Start' })).toHaveAttribute('aria-busy', 'true');
    await act(async () => post.release(new Response('Bad gateway', { status: 502 })));
    const alert = await screen.findByRole('alert', { name: 'Runner operation failed' });
    expect(alert).toHaveTextContent('The server returned HTTP 502.');
    expect(screen.getByRole('button', { name: 'Start' })).not.toHaveAttribute('aria-busy');
    await user.click(within(alert).getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('alert', { name: 'Runner operation failed' })).toBeNull();
  });

  it('uses local lifecycle reads and refreshes the open Inspector from GitHub inventory', async () => {
    let hardware = 'macOS';
    let status = 'online';
    serve((path) => {
      if (path === '/api/runners?local=1')
        return response({
          ...snapshot,
          runners: [{ ...runner, github_status: 'unknown', github_labels: undefined }],
        });
      if (path.startsWith('/api/activity/runners'))
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
    });
    await ready();
    const panel = within(screen.getByRole('complementary', { name: 'Runner details' }));
    expect(panel.getByText('macOS')).toHaveAttribute('title', 'GitHub default · read-only');
    expect(screen.getByRole('row', { name: 'build-mac-1, Idle, This device' })).toBeVisible();
    hardware = 'ARM64';
    status = 'offline';
    await userEvent.click(screen.getByRole('button', { name: 'Refresh runners' }));
    expect(await panel.findByText('ARM64')).toHaveAttribute('title', 'GitHub default · read-only');
    expect(panel.queryByText('macOS')).not.toBeInTheDocument();
    expect(screen.getByRole('row', { name: 'build-mac-1, Offline, This device' })).toBeVisible();
    await userEvent.click(panel.getByRole('button', { name: 'Edit…' }));
    expect(screen.getByRole('textbox', { name: 'Custom labels' })).toHaveValue('build');
    expect(requested((url) => url === '/api/runners?local=1')).toBe(true);
    expect(requested((url) => url === '/api/runners')).toBe(false);
  });

  it('keeps external Runner details read-only and lets the device filter narrow the list', async () => {
    serve((path) => {
      if (path.startsWith('/api/activity/runners'))
        return response({ runners: [remoteRunner], next_page: null, message: '' });
    });
    await ready(false);
    const user = userEvent.setup();
    await openDetails('remote-mac');
    const panel = within(screen.getByRole('complementary', { name: 'Runner details' }));
    expect(panel.getByText(/management is read-only/)).toBeVisible();
    for (const name of ['Stop', 'Restart', 'Delete runner…'])
      expect(panel.queryByRole('button', { name })).not.toBeInTheDocument();
    await user.click(panel.getByRole('button', { name: 'Close runner details' }));
    expect(screen.getByRole('button', { name: 'Details for remote-mac' })).toHaveFocus();
    await user.click(screen.getByRole('combobox', { name: 'Runner device' }));
    await user.click(screen.getByRole('option', { name: 'This device' }));
    expect(screen.queryByRole('row', { name: /remote-mac/ })).not.toBeInTheDocument();
    expect(screen.getByRole('row', { name: /build-mac-1/ })).toBeVisible();
    await user.click(screen.getByRole('combobox', { name: 'Runner device' }));
    await user.click(screen.getByRole('option', { name: 'Other devices' }));
    expect(screen.getByRole('row', { name: /remote-mac/ })).toBeVisible();
    expect(screen.queryByRole('row', { name: /build-mac-1/ })).not.toBeInTheDocument();
  });

  it('closes the filter menu with Escape while keeping runner details open', async () => {
    mount();
    await openDetails();
    const user = userEvent.setup();
    await user.click(screen.getByRole('combobox', { name: 'Runner status' }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Runner details' })).toBeVisible();
  });
});

describe('Add runner', () => {
  it('creates an organization runner and keeps its settings when moving Back', async () => {
    await ready();
    const user = userEvent.setup();
    const dialog = await openCreate(user);
    await user.click(dialog.getByRole('button', { name: 'Continue to target' }));
    await user.click(dialog.getByRole('button', { name: /^Organization:/ }));
    await user.click(dialog.getByRole('combobox', { name: 'Organization' }));
    await user.click(await dialog.findByRole('option', { name: /example.*Organization/ }));
    await user.click(dialog.getByText('Advanced settings'));
    await user.clear(dialog.getByLabelText('Name prefix'));
    await user.type(dialog.getByLabelText('Name prefix'), 'studio');
    await user.type(dialog.getByLabelText('Custom labels'), 'build, release');
    await user.click(dialog.getByRole('button', { name: 'Back' }));
    expect(dialog.getByRole('group', { name: 'Registration method' })).toBeVisible();
    await user.click(dialog.getByRole('button', { name: 'Continue to target' }));
    await user.click(dialog.getByText('Advanced settings'));
    expect(dialog.getByLabelText('Name prefix')).toHaveValue('studio');
    await user.click(dialog.getByRole('button', { name: 'Create runner' }));
    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(postBody()).toEqual({
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

  it('keeps the target after registration needs SSO and retries without an access check', async () => {
    let authorized = false;
    serve((path, options) => {
      if (path === '/api/runners' && options?.method === 'POST' && !authorized)
        return response({ error: 'GitHub requires SSO authorization.' }, 400);
    });
    await ready();
    const user = userEvent.setup();
    const dialog = await openCreate(user);
    await chooseRepo(dialog, user);
    await user.click(dialog.getByRole('button', { name: 'Create runner' }));
    expect(await dialog.findByText(/GitHub requires SSO authorization/)).toBeVisible();
    expect(dialog.getByText('example/build')).toBeVisible();
    expect(dialog.getByRole('button', { name: 'Connection settings' })).toBeVisible();
    authorized = true;
    await user.click(dialog.getByRole('button', { name: 'Create runner' }));
    await waitFor(() => expect(posts()).toHaveLength(2));
    expect(requested((url) => url === '/api/github/check')).toBe(false);
  });

  it('shows setup progress until the backend finishes creating', async () => {
    const post = gate();
    serve((path, options) => {
      if (path === '/api/runners' && options?.method === 'POST') return post.next();
    });
    await ready();
    const user = userEvent.setup();
    const dialog = await openCreate(user);
    await chooseRepo(dialog, user);
    await user.click(dialog.getByRole('button', { name: 'Create runner' }));
    expect(await dialog.findByRole('button', { name: 'Creating…' })).toBeDisabled();
    expect(dialog.getByText('Setting up your runner')).toBeVisible();
    expect(dialog.getByText('Creating').closest('li')).toHaveAttribute('aria-current', 'step');
    await act(async () => post.release(response({})));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('creates from a repository URL and registration token without a GitHub login', async () => {
    serve((path) => {
      if (path === '/api/github/connection') return disconnectedAnswer();
    });
    mount();
    const user = userEvent.setup();
    await screen.findByRole('button', { name: 'Add runner' });
    const dialog = await openCreate(user);
    await chooseTokenRepo(dialog, user);
    await user.type(dialog.getByLabelText('Repository'), 'https://github.com/example/build');
    await user.type(dialog.getByLabelText('Registration token'), 'fixture-token');
    await user.click(dialog.getByRole('button', { name: 'Create runner' }));
    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(postBody()).toMatchObject({
      kind: 'repo',
      target: 'example/build',
      registration_token: 'fixture-token',
    });
    expect(requested((url) => url === '/api/github/check')).toBe(false);
  });

  it('rejects a repository URL while organization scope is selected', async () => {
    await ready();
    const user = userEvent.setup();
    const dialog = await openCreate(user);
    await chooseTokenRepo(dialog, user);
    await user.click(dialog.getByRole('button', { name: /^Organization:/ }));
    await user.type(dialog.getByLabelText('Organization'), 'https://github.com/example/build');
    expect(dialog.getByText(/Use the organization name/)).toBeVisible();
    expect(dialog.getByRole('button', { name: 'Create runner' })).toBeDisabled();
  });
});

// Polls as App does and shows the operation lock, so the test can tell when an update landed.
function RunnerPollingProbe() {
  useRunnerPolling();
  const locked = useRunnerOperationLocked();
  return <output aria-label="Runner operation">{String(locked)}</output>;
}

it('keeps runner updates from rerendering the app navigation', async () => {
  const onRender = vi.fn();
  startAppSession();
  render(
    <QueryClientProvider client={client}>
      <Profiler id="navigation" onRender={onRender}>
        <AppNavigation />
      </Profiler>
      <RunnerPollingProbe />
    </QueryClientProvider>,
  );
  // The Runners/Runs switch replaces its skeleton once the first snapshot arrives.
  expect(await screen.findByRole('group', { name: 'Activity view' })).toBeVisible();
  const renders = onRender.mock.calls.length;
  await act(async () => {
    client.setQueryData(RUNNERS_KEY, { ...snapshot, operation_running: true });
  });
  await waitFor(() => expect(screen.getByLabelText('Runner operation')).toHaveTextContent('true'));
  expect(onRender).toHaveBeenCalledTimes(renders);
});
