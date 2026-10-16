import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createQueryClient } from '../../../shared/api/query-client';
import type { ManagerSettings, ManagerUpdate, ManagerUpdateStatus } from '../types/manager';
import { ManagerSettingsAction } from './ManagerSettingsAction';
import { ManagerSettingsDialog } from './ManagerSettingsDialog';

const settings: ManagerSettings = {
  lan_access: false,
  version: '0.1.0',
  source: 'script',
  managed: true,
  process_id: 1000,
};
const update: ManagerUpdate = {
  current_version: '0.1.0',
  latest_version: '0.2.0',
  available: true,
  source: 'script',
  can_update: true,
  message: 'A new version is available.',
};
const running: ManagerUpdateStatus = { state: 'running', message: 'Downloading mactions…' };
const lanAccess = { name: 'Allow access from other devices' };
const fetchMock = vi.fn<typeof fetch>();
let client: ReturnType<typeof createQueryClient>;

function response(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function defaultData(path: string, method: string) {
  switch (path) {
    case '/api/manager/settings':
      if (method === 'POST') return { ...settings, lan_access: true, restart_scheduled: true };
      return settings;
    case '/api/manager/update':
      if (method === 'POST') return running;
      return update;
    case '/api/manager/update-status':
      return { state: 'idle', message: '' };
    case '/api/manager/health':
      return { version: '0.2.0', data_dir: '/managed', process_id: 2000 };
    default:
      throw new Error(`Unexpected request: ${path}`);
  }
}

// Answers a request from the override when it returns one, else from the default manager state.
function serve(override: (path: string, method: string) => Promise<Response> | Response | void) {
  fetchMock.mockImplementation(async (url, options) => {
    const path = String(url);
    const method = options?.method ?? 'GET';
    return (await override(path, method)) ?? response(defaultData(path, method));
  });
}

const called = (path: string) => fetchMock.mock.calls.some(([url]) => url === path);

beforeEach(() => {
  client = createQueryClient();
  fetchMock.mockReset();
  serve(() => undefined);
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  client.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function mount() {
  const onReload = vi.fn();
  const view = render(
    <QueryClientProvider client={client}>
      <ManagerSettingsDialog onClose={vi.fn()} onReload={onReload} />
    </QueryClientProvider>,
  );
  return { ...view, onReload };
}

async function saveLanAccess() {
  await userEvent.click(await screen.findByRole('checkbox', lanAccess));
  await userEvent.click(screen.getByRole('button', { name: 'Save network settings' }));
}

describe('manager settings', () => {
  it('loads settings and update information only after opening the dialog', async () => {
    render(
      <QueryClientProvider client={client}>
        <ManagerSettingsAction />
      </QueryClientProvider>,
    );
    expect(fetchMock).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeVisible();
    expect(await screen.findByRole('checkbox', lanAccess)).not.toBeChecked();
    expect(await screen.findByText('mactions 0.1.0 · Installer script')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('saves LAN access and reloads only once a new manager process is healthy', async () => {
    let healthReads = 0;
    serve((path) => {
      if (path !== '/api/manager/health') return;
      healthReads += 1;
      // The first read still reaches the previous process.
      let process_id = settings.process_id;
      if (healthReads > 1) process_id = 2000;
      return response({ version: settings.version, process_id, data_dir: '/managed' });
    });
    const { onReload } = mount();
    expect(await screen.findByRole('button', { name: 'Save network settings' })).toBeDisabled();
    await saveLanAccess();
    await screen.findByText('Restarting the manager and reconnecting…');
    expect(screen.getByRole('button', { name: 'Restarting…' })).toBeDisabled();
    expect(
      fetchMock.mock.calls.find(
        ([url, options]) => url === '/api/manager/settings' && options?.method === 'POST',
      )?.[1]?.body,
    ).toBe(JSON.stringify({ lan_access: true }));
    await waitFor(() => expect(healthReads).toBe(1), { timeout: 3000 });
    expect(onReload).not.toHaveBeenCalled();
    await waitFor(() => expect(onReload).toHaveBeenCalledOnce(), { timeout: 3000 });
    expect(healthReads).toBe(2);
    expect(fetchMock.mock.calls.some(([url]) => String(url).startsWith('/api/runners'))).toBe(
      false,
    );
  });

  it('keeps the network draft available when saving fails', async () => {
    serve((path, method) => {
      if (path === '/api/manager/settings' && method === 'POST')
        return response({ error: 'Could not restart the manager.' }, 500);
    });
    const { onReload } = mount();
    await saveLanAccess();
    expect(
      await screen.findByText(
        'Could not save network settings: Could not restart the manager. Try saving again.',
      ),
    ).toBeVisible();
    expect(screen.getByRole('checkbox', lanAccess)).toBeChecked();
    expect(screen.getByRole('button', { name: 'Save network settings' })).toBeEnabled();
    expect(onReload).not.toHaveBeenCalled();
  });

  it('uses refreshed network settings until the user changes the draft', async () => {
    client.setQueryData(['manager-settings'], settings);
    serve((path) => {
      if (path === '/api/manager/settings') return response({ ...settings, lan_access: true });
    });
    mount();
    await waitFor(() => expect(screen.getByRole('checkbox', lanAccess)).toBeChecked());
    expect(screen.getByRole('button', { name: 'Save network settings' })).toBeDisabled();
  });

  it.each([
    {
      when: 'another client already saved the setting',
      saved: { ...settings, lan_access: true, restart_scheduled: false },
      message: 'Settings saved. No additional restart is needed.',
    },
    {
      when: 'the installation is unmanaged',
      saved: { ...settings, managed: false, lan_access: true },
      message: 'Settings saved. Restart the manager manually to apply them.',
    },
  ])('does not await a restart when $when', async ({ saved, message }) => {
    serve((path, method) => {
      if (path === '/api/manager/settings' && method === 'POST') return response(saved);
    });
    const { onReload } = mount();
    await saveLanAccess();
    expect(await screen.findByText(message)).toBeVisible();
    expect(called('/api/manager/health')).toBe(false);
    expect(onReload).not.toHaveBeenCalled();
  });

  it('keeps cached settings and offers a retry when refreshing them fails', async () => {
    client.setQueryData(['manager-settings'], settings);
    let failing = true;
    serve((path) => {
      if (path === '/api/manager/settings' && failing)
        return response({ error: 'Manager is busy.' }, 503);
    });
    mount();
    expect(
      await screen.findByText(/^Could not refresh settings: Manager is busy\. /u),
    ).toBeVisible();
    expect(screen.getByRole('checkbox', lanAccess)).toBeVisible();
    failing = false;
    await userEvent.click(within(screen.getByRole('alert')).getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });
});

describe('manager updates', () => {
  it('does not mistake a previous completed update for a request that never reached the server', async () => {
    serve((path, method) => {
      if (path === '/api/manager/update' && method === 'POST')
        throw new TypeError('Failed to fetch');
      if (path === '/api/manager/update-status')
        return response({
          state: 'complete',
          message: 'Previous update completed.',
          from_version: '0.0.1',
          to_version: '0.1.0',
        });
    });
    const { onReload } = mount();
    await userEvent.click(await screen.findByRole('button', { name: 'Update to 0.2.0' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The update request could not be confirmed. Check for updates and try again.',
    );
    expect(screen.queryByText('Previous update completed.')).not.toBeInTheDocument();
    expect(called('/api/manager/health')).toBe(false);
    expect(onReload).not.toHaveBeenCalled();
  });

  it('pauses active update polling while the page is hidden and stops after closing', async () => {
    serve((path) => {
      if (path === '/api/manager/update-status') return response(running);
    });
    const view = mount();
    await screen.findByText('Downloading mactions…');
    const reads = () =>
      fetchMock.mock.calls.filter(([url]) => url === '/api/manager/update-status').length;
    const wait = () =>
      act(async () => {
        await new Promise((resolve) => window.setTimeout(resolve, 1700));
      });
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    const beforeHidden = reads();
    await wait();
    expect(reads()).toBe(beforeHidden);
    hidden.mockReturnValue(false);
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    await waitFor(() => expect(reads()).toBeGreaterThan(beforeHidden), { timeout: 3000 });
    view.unmount();
    const beforeClose = reads();
    await wait();
    expect(reads()).toBe(beforeClose);
  }, 10000);

  it('starts an update, survives a temporary restart, and reloads after success', async () => {
    let started = false;
    let statusReads = 0;
    let healthReads = 0;
    serve((path, method) => {
      if (path === '/api/manager/update' && method === 'POST') started = true;
      if (path === '/api/manager/update-status' && started) {
        statusReads += 1;
        if (statusReads === 1) throw new TypeError('Failed to fetch');
        return response({
          state: 'complete',
          message: 'Done.',
          from_version: '0.1.0',
          to_version: '0.2.0',
        });
      }
      if (path === '/api/manager/health') {
        healthReads += 1;
        let version = '0.1.0';
        if (healthReads > 1) version = '0.2.0';
        return response({ version, data_dir: '/managed', process_id: 2000 });
      }
    });
    const { onReload } = mount();
    await userEvent.click(await screen.findByRole('button', { name: 'Update to 0.2.0' }));
    expect(await screen.findByText('Downloading mactions…')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Save network settings' })).toBeDisabled();
    await screen.findByText(
      'The manager is restarting. Reconnecting to check update progress…',
      {},
      { timeout: 3000 },
    );
    await waitFor(() => expect(healthReads).toBe(1), { timeout: 3000 });
    expect(onReload).not.toHaveBeenCalled();
    await waitFor(() => expect(onReload).toHaveBeenCalledOnce(), { timeout: 3000 });
  }, 10000);

  it('shows the update failure and its log without reloading', async () => {
    serve((path, method) => {
      if (path === '/api/manager/update' && method === 'POST')
        return response({
          state: 'failed',
          message: 'Previous version restored.',
          log: 'Health check failed.',
        });
    });
    const { onReload } = mount();
    await userEvent.click(await screen.findByRole('button', { name: 'Update to 0.2.0' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Previous version restored.');
    await userEvent.click(screen.getByText('Update log'));
    expect(screen.getByText('Health check failed.')).toBeVisible();
    expect(onReload).not.toHaveBeenCalled();
  });

  it('retries a failed update check and states once that the manager is up to date', async () => {
    let checks = 0;
    serve((path, method) => {
      if (path !== '/api/manager/update' || method === 'POST') return;
      checks += 1;
      if (checks === 1) return response({ error: 'GitHub is unavailable.' }, 503);
      return response({ ...update, latest_version: '0.1.0', available: false, message: '' });
    });
    mount();
    expect(
      await screen.findByText(
        'Could not check for updates: GitHub is unavailable. Use Check for updates to try again.',
      ),
    ).toBeVisible();
    expect(await screen.findByText('mactions 0.1.0 · Installer script')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Check for updates' }));
    expect(await screen.findByText(/^Up to date as of /u)).toBeVisible();
    expect(screen.queryByText(/latest available version/u)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Check for updates' }));
    await waitFor(() => expect(checks).toBe(3));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Check for updates' })).toBeEnabled(),
    );
    expect(screen.getAllByText(/^Up to date as of /u)).toHaveLength(1);
  });

  it.each([
    ['', 'Use the installer script or Homebrew to enable managed updates.'],
    [
      'Install with the official script or Homebrew to enable managed updates.',
      'Install with the official script or Homebrew to enable managed updates.',
    ],
  ])(
    'offers no update for manual builds and shows one guidance line (server message %j)',
    async (message, guidance) => {
      serve((path) => {
        if (path === '/api/manager/update')
          return response({ ...update, source: 'manual', can_update: false, message });
      });
      mount();
      expect(await screen.findByText('mactions 0.1.0 · Manual installation')).toBeVisible();
      expect(screen.getByText(guidance)).toBeVisible();
      expect(screen.getAllByText(/Homebrew to enable managed updates\.$/u)).toHaveLength(1);
      expect(screen.queryByRole('button', { name: 'Update to 0.2.0' })).not.toBeInTheDocument();
    },
  );
});
