import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
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
const idle: ManagerUpdateStatus = { state: 'idle', message: '' };
const running: ManagerUpdateStatus = { state: 'running', message: 'Downloading mactions…' };
const complete: ManagerUpdateStatus = {
  state: 'complete',
  message: 'Update completed.',
  from_version: '0.1.0',
  to_version: '0.2.0',
};
const fetchMock = vi.fn<typeof fetch>();
let client: ReturnType<typeof createQueryClient>;

function response(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function dataFor(url: RequestInfo | URL, options?: RequestInit) {
  const path = String(url);
  switch (path) {
    case '/api/manager/settings':
      if (options?.method === 'POST')
        return { ...settings, lan_access: true, restart_scheduled: true };
      return settings;
    case '/api/manager/update':
      if (options?.method === 'POST') return running;
      return update;
    case '/api/manager/update-status':
      return idle;
    case '/api/manager/health':
      return { version: '0.2.0', data_dir: '/managed', process_id: 2000 };
    default:
      throw new Error(`Unexpected request: ${path}`);
  }
}

beforeEach(() => {
  client = createQueryClient();
  fetchMock.mockReset().mockImplementation(async (url, options) => response(dataFor(url, options)));
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  client.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function mount(onReload = vi.fn()) {
  const view = render(
    <QueryClientProvider client={client}>
      <ManagerSettingsDialog onClose={vi.fn()} onReload={onReload} />
    </QueryClientProvider>,
  );
  return { ...view, onReload };
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
    expect(
      await screen.findByRole('checkbox', { name: 'Allow access from other devices' }),
    ).not.toBeChecked();
    expect(await screen.findByText('mactions 0.1.0 · Installer script')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('saves LAN access and reloads only after the manager is healthy', async () => {
    const { onReload } = mount();
    const checkbox = await screen.findByRole('checkbox', {
      name: 'Allow access from other devices',
    });
    const save = screen.getByRole('button', { name: 'Save network settings' });
    expect(save).toBeDisabled();
    await userEvent.click(checkbox);
    await userEvent.click(save);
    await screen.findByText('Restarting the manager and reconnecting…');
    expect(
      fetchMock.mock.calls.find(
        ([url, options]) => url === '/api/manager/settings' && options?.method === 'POST',
      )?.[1]?.body,
    ).toBe(JSON.stringify({ lan_access: true }));
    expect(onReload).not.toHaveBeenCalled();
    expect(
      screen.getByText('Saving restarts the manager dashboard. Runners continue running.'),
    ).toBeVisible();
    await waitFor(() => expect(onReload).toHaveBeenCalledOnce(), { timeout: 3000 });
    expect(fetchMock.mock.calls.some(([url]) => String(url).startsWith('/api/runners'))).toBe(
      false,
    );
  });

  it('keeps the network draft available when saving fails', async () => {
    fetchMock.mockImplementation(async (url, options) => {
      if (url === '/api/manager/settings' && options?.method === 'POST')
        return response({ error: 'Could not restart the manager.' }, 500);
      return response(dataFor(url, options));
    });
    const { onReload } = mount();
    await userEvent.click(
      await screen.findByRole('checkbox', { name: 'Allow access from other devices' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save network settings' }));
    expect(await screen.findByText('Could not restart the manager.')).toBeVisible();
    expect(screen.getByRole('checkbox', { name: 'Allow access from other devices' })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Save network settings' })).toBeEnabled();
    expect(onReload).not.toHaveBeenCalled();
  });

  it('uses refreshed network settings until the user changes the draft', async () => {
    client.setQueryData(['manager-settings'], settings);
    fetchMock.mockImplementation(async (url, options) => {
      if (url === '/api/manager/settings') return response({ ...settings, lan_access: true });
      return response(dataFor(url, options));
    });
    mount();
    await waitFor(() =>
      expect(
        screen.getByRole('checkbox', { name: 'Allow access from other devices' }),
      ).toBeChecked(),
    );
    expect(screen.getByRole('button', { name: 'Save network settings' })).toBeDisabled();
  });

  it('does not reload while the previous manager process still responds', async () => {
    let healthReads = 0;
    fetchMock.mockImplementation(async (url, options) => {
      if (url === '/api/manager/health') {
        healthReads += 1;
        let process_id = settings.process_id;
        if (healthReads > 1) process_id = 2000;
        return response({ version: settings.version, process_id, data_dir: '/managed' });
      }
      return response(dataFor(url, options));
    });
    const { onReload } = mount();
    await userEvent.click(
      await screen.findByRole('checkbox', { name: 'Allow access from other devices' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save network settings' }));
    await waitFor(() => expect(healthReads).toBe(1), { timeout: 3000 });
    expect(onReload).not.toHaveBeenCalled();
    await waitFor(() => expect(onReload).toHaveBeenCalledOnce(), { timeout: 2000 });
    expect(healthReads).toBe(2);
  });

  it('does not await a restart when another client already saved the setting', async () => {
    fetchMock.mockImplementation(async (url, options) => {
      if (url === '/api/manager/settings' && options?.method === 'POST')
        return response({ ...settings, lan_access: true, restart_scheduled: false });
      return response(dataFor(url, options));
    });
    const { onReload } = mount();
    await userEvent.click(
      await screen.findByRole('checkbox', { name: 'Allow access from other devices' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save network settings' }));
    expect(
      await screen.findByText('Settings saved. No additional restart is needed.'),
    ).toBeVisible();
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/manager/health')).toBe(false);
    expect(onReload).not.toHaveBeenCalled();
  });

  it('explains manual manager restart when the installation is unmanaged', async () => {
    fetchMock.mockImplementation(async (url, options) => {
      if (url === '/api/manager/settings') {
        let lan_access = false;
        if (options?.method === 'POST') lan_access = true;
        return response({ ...settings, managed: false, lan_access });
      }
      return response(dataFor(url, options));
    });
    const { onReload } = mount();
    await userEvent.click(
      await screen.findByRole('checkbox', { name: 'Allow access from other devices' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save network settings' }));
    expect(
      await screen.findByText('Settings saved. Restart the manager manually to apply them.'),
    ).toBeVisible();
    expect(onReload).not.toHaveBeenCalled();
  });
});

describe('manager updates', () => {
  it('does not mistake a previous completed update for a request that never reached the server', async () => {
    fetchMock.mockImplementation(async (url, options) => {
      if (url === '/api/manager/update' && options?.method === 'POST')
        throw new TypeError('Failed to fetch');
      if (url === '/api/manager/update-status')
        return response({
          state: 'complete',
          message: 'Previous update completed.',
          from_version: '0.0.1',
          to_version: '0.1.0',
        });
      return response(dataFor(url, options));
    });
    const { onReload } = mount();
    await userEvent.click(await screen.findByRole('button', { name: 'Update to 0.2.0' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The update request could not be confirmed. Check for updates and try again.',
    );
    expect(screen.queryByText('Previous update completed.')).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/manager/health')).toBe(false);
    expect(onReload).not.toHaveBeenCalled();
  });

  it('pauses active update polling while the page is hidden and stops after closing', async () => {
    fetchMock.mockImplementation(async (url, options) => {
      if (url === '/api/manager/update-status') return response(running);
      return response(dataFor(url, options));
    });
    const view = mount();
    await screen.findByText('Downloading mactions…');
    const reads = () =>
      fetchMock.mock.calls.filter(([url]) => url === '/api/manager/update-status').length;
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    const beforeHidden = reads();
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 1700));
    });
    expect(reads()).toBe(beforeHidden);
    hidden.mockReturnValue(false);
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    await waitFor(() => expect(reads()).toBeGreaterThan(beforeHidden), { timeout: 3000 });
    view.unmount();
    const beforeClose = reads();
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 1700));
    });
    expect(reads()).toBe(beforeClose);
  }, 10000);

  it('starts an update, survives a temporary restart, and reloads after success', async () => {
    let started = false;
    let statusReads = 0;
    let healthReads = 0;
    fetchMock.mockImplementation(async (url, options) => {
      if (url === '/api/manager/update' && options?.method === 'POST') {
        started = true;
        return response(running);
      }
      if (url === '/api/manager/update-status' && started) {
        statusReads += 1;
        if (statusReads === 1) throw new TypeError('Failed to fetch');
        return response(complete);
      }
      if (url === '/api/manager/health') {
        healthReads += 1;
        let version = '0.1.0';
        if (healthReads > 1) version = '0.2.0';
        return response({ version, data_dir: '/managed', process_id: 2000 });
      }
      return response(dataFor(url, options));
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
    expect(onReload).not.toHaveBeenCalled();
    await waitFor(() => expect(healthReads).toBe(1), { timeout: 3000 });
    expect(onReload).not.toHaveBeenCalled();
    await waitFor(() => expect(onReload).toHaveBeenCalledOnce(), { timeout: 3000 });
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/manager/health')).toBe(true);
  }, 10000);

  it('shows the update failure and its log without reloading', async () => {
    fetchMock.mockImplementation(async (url, options) => {
      if (url === '/api/manager/update' && options?.method === 'POST')
        return response({
          state: 'failed',
          message: 'Previous version restored.',
          log: 'Health check failed.',
        });
      return response(dataFor(url, options));
    });
    const { onReload } = mount();
    await userEvent.click(await screen.findByRole('button', { name: 'Update to 0.2.0' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Previous version restored.');
    await userEvent.click(screen.getByText('Update log'));
    expect(screen.getByText('Health check failed.')).toBeVisible();
    expect(onReload).not.toHaveBeenCalled();
  });

  it('offers another check when checking for updates fails', async () => {
    let checks = 0;
    fetchMock.mockImplementation(async (url, options) => {
      if (url === '/api/manager/update' && options?.method !== 'POST') {
        checks += 1;
        if (checks === 1) return response({ error: 'GitHub is unavailable.' }, 503);
      }
      return response(dataFor(url, options));
    });
    mount();
    expect(await screen.findByText('GitHub is unavailable.')).toBeVisible();
    expect(await screen.findByText('mactions 0.1.0 · Installer script')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Check for updates' }));
    expect(await screen.findByRole('button', { name: 'Update to 0.2.0' })).toBeEnabled();
  });

  it('does not offer an update for manually extracted builds', async () => {
    fetchMock.mockImplementation(async (url, options) => {
      if (url === '/api/manager/update')
        return response({ ...update, source: 'manual', can_update: false });
      return response(dataFor(url, options));
    });
    mount();
    expect(await screen.findByText('mactions 0.1.0 · Manual installation')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Update to 0.2.0' })).not.toBeInTheDocument();
    expect(
      screen.getByText('Use the installer script or Homebrew to enable managed updates.'),
    ).toBeVisible();
  });
});
