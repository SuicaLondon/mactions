import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { CONNECTION_KEY } from '../../features/github/hooks/use-connection';
import {
  client,
  disconnectedAnswer,
  fetchMock,
  gate,
  mount,
  openDetails,
  postBody,
  posts,
  requestedActivity,
  response,
  runner,
  serve,
  serveDisconnected,
  setupAppTests,
  snapshot,
  viewButton,
} from '../../test/app-harness';

setupAppTests();

const firstVisit = () => localStorage.removeItem('mactions.welcome.v1');
const authorizationStarted = () =>
  fetchMock.mock.calls.some(
    ([url, options]) => url === '/api/github/auth' && options?.method === 'POST',
  );
const connectionGuide = () =>
  screen.queryByRole('heading', { name: 'Connect GitHub to get started' });

describe('returning visitors', () => {
  it('reports a failed GitHub connection check on the runs page and retries it', async () => {
    let failing = true;
    serve((path) => {
      if (path === '/api/github/connection' && failing) return new Response('', { status: 503 });
    });
    mount();
    const user = userEvent.setup();
    await screen.findByRole('button', { name: `Details for ${runner.name}` });
    await user.click(viewButton('Runs'));
    expect(
      await screen.findByRole('heading', { name: 'Could not check GitHub connection' }),
    ).toBeVisible();
    expect(screen.getByText(/The server returned HTTP 503\./)).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Connect GitHub to view runs' })).toBeNull();
    failing = false;
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() =>
      expect(
        screen.queryByRole('heading', { name: 'Could not check GitHub connection' }),
      ).toBeNull(),
    );
  });

  it('shows local logs and local controls while GitHub is disconnected', async () => {
    serve((path) => {
      if (path === '/api/github/connection') return disconnectedAnswer();
      if (path.includes('/logs'))
        return response({
          files: [{ name: '_diag/Runner_1.log', bytes: 12 }],
          selected: '_diag/Runner_1.log',
          content: 'Listening for Jobs',
          truncated: false,
          total_bytes: 12,
        });
    });
    mount();
    await openDetails();
    expect(screen.getByRole('button', { name: 'Stop' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Restart' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Delete runner…' })).toBeDisabled();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Runner diagnostic logs' }));
    expect(await screen.findByText('Listening for Jobs')).toBeVisible();
    expect(screen.queryByRole('complementary', { name: 'Runner details' })).not.toBeInTheDocument();
    const wrap = screen.getByRole('button', { name: 'Wrap lines' });
    expect(wrap).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Runner log output')).toHaveAttribute('data-wrapped');
    await user.click(wrap);
    expect(screen.getByLabelText('Runner log output')).not.toHaveAttribute('data-wrapped');
    await user.click(screen.getByRole('button', { name: 'Follow output' }));
    expect(screen.getByRole('button', { name: 'Follow output' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await user.click(screen.getByRole('button', { name: 'Pause live updates' }));
    expect(screen.getByRole('button', { name: 'Resume live updates' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.queryByText('Listening for Jobs')).not.toBeInTheDocument();
    await user.click(viewButton('Runs'));
    expect(screen.getByRole('heading', { name: 'Connect GitHub to view runs' })).toBeVisible();
    expect(requestedActivity('runs')).toHaveLength(0);
  });

  it('refreshes local runner state while GitHub is disconnected', async () => {
    serveDisconnected();
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

  it('shows a device code and a browser link without depending on the host browser', async () => {
    let started = false;
    serve((path, options) => {
      if (path === '/api/github/connection') return disconnectedAnswer();
      if (path !== '/api/github/auth') return;
      if (options?.method === 'POST') started = true;
      if (!started)
        return response({ status: 'idle', code: null, url: 'https://github.com/login/device' });
      return response({
        status: 'pending',
        code: 'ABCD-1234',
        url: 'https://github.com/login/device',
      });
    });
    mount();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Start GitHub authorization' }));
    expect(await screen.findByText('ABCD-1234')).toBeVisible();
    const link = screen.getByRole('link', { name: 'Open GitHub' });
    expect(link).toHaveAttribute('href', 'https://github.com/login/device');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('guides disconnected users immediately and lets them keep using local controls', async () => {
    serveDisconnected();
    mount();
    const user = userEvent.setup();
    expect(
      await screen.findByRole('heading', { name: 'Connect GitHub to get started' }),
    ).toBeVisible();
    await user.click(screen.getByText('Prefer the terminal?'));
    expect(screen.getByText('gh auth login --hostname github.com --web')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Continue with local controls' }));
    expect(connectionGuide()).not.toBeInTheDocument();
    await openDetails();
    expect(screen.getByRole('button', { name: 'Stop' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Connect GitHub' }));
    expect(screen.getByRole('button', { name: 'Start GitHub authorization' })).toBeVisible();
  });

  it('opens the registration token path directly from the connection guide', async () => {
    serveDisconnected();
    mount();
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole('button', { name: 'Use a registration token instead' }),
    );
    const dialog = within(screen.getByRole('dialog'));
    await user.type(dialog.getByLabelText('Repository'), 'example/build');
    await user.type(dialog.getByLabelText('Registration token'), 'fixture-token');
    await user.click(dialog.getByRole('button', { name: 'Create runner' }));
    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(postBody()).toMatchObject({ registration_token: 'fixture-token' });
  });

  it('lists account permissions and still allows registration tokens', async () => {
    serve((path) => {
      if (path === '/api/github/connection')
        return response({
          connected: true,
          login: 'octocat',
          name: 'The Octocat',
          scopes: ['repo', 'read:org'],
          message: 'Connected',
        });
    });
    mount();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'GitHub CLI · @octocat' }));
    const dialog = within(screen.getByRole('dialog', { name: 'GitHub account' }));
    expect(await dialog.findByRole('link', { name: '@octocat' })).toBeVisible();
    expect(dialog.getByText('The Octocat')).toBeVisible();
    const permissions = within(dialog.getByRole('list', { name: 'What mactions can do' }));
    expect(permissions.getByText('Repository runners').closest('li')).toHaveTextContent('Allowed');
    expect(permissions.getByText('Organization runners').closest('li')).toHaveTextContent(
      'Needs admin:org',
    );
    expect(
      within(dialog.getByRole('list', { name: 'Token scopes' })).getAllByRole('listitem'),
    ).toHaveLength(2);
    expect(dialog.getByRole('button', { name: 'Grant organization access' })).toBeEnabled();
    await user.click(dialog.getByRole('button', { name: 'Use a registration token' }));
    const create = within(screen.getByRole('dialog', { name: 'Add runner' }));
    expect(create.getByLabelText('Registration token')).toBeVisible();
  });
});

describe('first visit', () => {
  it('reuses the GitHub CLI login without opening setup', async () => {
    firstVisit();
    const view = mount();
    const user = userEvent.setup();
    expect(await screen.findByRole('button', { name: 'GitHub CLI · @octocat' })).toBeVisible();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(connectionGuide()).not.toBeInTheDocument();
    expect(authorizationStarted()).toBe(false);
    view.unmount();
    mount();
    await user.click(await screen.findByRole('button', { name: 'GitHub CLI · @octocat' }));
    expect(screen.getByRole('dialog', { name: 'GitHub account' })).toBeVisible();
  });

  it('remembers reused CLI login and avoids reopening onboarding after disconnection', async () => {
    firstVisit();
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
    firstVisit();
    const runners = gate();
    serve((path) => {
      if (path.startsWith('/api/runners')) return runners.next();
    });
    mount();
    expect(screen.getByRole('status', { name: 'Loading runners…' })).toHaveTextContent('');
    expect(screen.getByRole('status', { name: 'Loading filters…' })).toHaveTextContent('');
    expect(await screen.findByText('GitHub CLI · @octocat')).toBeVisible();
    expect(
      screen.getAllByRole('button').map((button) => button.getAttribute('aria-label')),
    ).toEqual(['Keyboard shortcuts']);
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('grid', { name: 'Runners' })).not.toBeInTheDocument();
    await act(async () => runners.release(response(snapshot)));
    expect(await screen.findByRole('button', { name: 'Add runner' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'GitHub CLI · @octocat' })).toBeVisible();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('waits for a confirmed disconnection before opening the first-visit dialog', async () => {
    firstVisit();
    const connection = gate();
    serve((path) => {
      if (path === '/api/github/connection') return connection.next();
    });
    mount();
    await openDetails();
    expect(screen.getByRole('button', { name: 'Stop' })).toBeVisible();
    expect(screen.getByRole('status', { name: 'Checking GitHub connection…' })).toBeVisible();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(connectionGuide()).not.toBeInTheDocument();
    await act(async () => connection.release(disconnectedAnswer()));
    expect(await screen.findByRole('dialog', { name: 'Welcome to mactions' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'GitHub CLI · Not connected' })).toBeVisible();
  });

  it.each([
    ['a failed check', () => response({ error: 'Connection request failed.' }, 503)],
    [
      'an unreachable GitHub',
      () =>
        response({
          connected: false,
          state: 'unavailable',
          message: 'GitHub is temporarily unreachable.',
        }),
    ],
  ])('shows an unavailable CLI status without opening setup after %s', async (_case, answer) => {
    firstVisit();
    serve((path) => {
      if (path === '/api/github/connection') return answer();
    });
    mount();
    expect(
      await screen.findByRole('button', { name: 'GitHub CLI · Status unavailable' }),
    ).toBeVisible();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(connectionGuide()).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Start GitHub authorization' }),
    ).not.toBeInTheDocument();
  });

  it.each([
    ['the first-visit dialog', true],
    ['the connection guide', false],
  ])('closes %s once authorization completes', async (_case, fresh) => {
    if (fresh) firstVisit();
    let connected = false;
    serve((path) => {
      if (path === '/api/github/connection' && !connected) return disconnectedAnswer();
    });
    mount();
    if (fresh) await screen.findByRole('dialog', { name: 'Welcome to mactions' });
    else await screen.findByRole('heading', { name: 'Connect GitHub to get started' });
    // Only a completion that follows an attempt seen in progress counts as a new sign-in.
    const device = { code: 'ABCD-1234', url: 'https://github.com/login/device' };
    act(() => client.setQueryData(['github-auth'], { status: 'pending', ...device }));
    expect(await screen.findByText(device.code)).toBeVisible();
    connected = true;
    act(() => client.setQueryData(['github-auth'], { status: 'complete', code: null, url: '' }));
    expect(await screen.findByRole('button', { name: 'GitHub CLI · @octocat' })).toBeVisible();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(connectionGuide()).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Authorize GitHub again' }),
    ).not.toBeInTheDocument();
  });

  it('offers login and token setup inside the first-visit dialog when disconnected', async () => {
    firstVisit();
    serveDisconnected();
    mount();
    const user = userEvent.setup();
    const dialog = within(await screen.findByRole('dialog', { name: 'Welcome to mactions' }));
    expect(await dialog.findByRole('button', { name: 'Start GitHub authorization' })).toBeVisible();
    await user.click(dialog.getByRole('button', { name: /^Registration token/ }));
    expect(
      dialog.getByText('Some features are limited without a GitHub connection.'),
    ).toBeVisible();
    await user.click(dialog.getByRole('button', { name: 'Continue with registration token' }));
    expect(screen.queryByRole('dialog', { name: 'Welcome to mactions' })).not.toBeInTheDocument();
    expect(
      within(screen.getByRole('dialog', { name: 'Add runner' })).getByLabelText('Repository'),
    ).toBeVisible();
  });
});
