import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createQueryClient } from '../../../../shared/api/query-client';
import { CONNECTION_KEY } from '../../../github/hooks/use-connection';
import { CreateDialog } from '../../creation/components/CreateDialog';
import { useRunnerCreationStore } from '../../creation/stores/runner-creation-store';
import { StorageDialog } from './StorageDialog';

type CreationOptions = Parameters<ReturnType<typeof useRunnerCreationStore.getState>['start']>[0];

const fetchMock = vi.fn<typeof fetch>();

let client: ReturnType<typeof createQueryClient>;

function response(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const rejected = () => response({ error: 'GitHub rejected the token' }, 422);
const isCreate = (url: RequestInfo | URL, options?: RequestInit) =>
  url === '/api/runners' && options?.method === 'POST';
const posts = () => fetchMock.mock.calls.filter(([url, options]) => isCreate(url, options));
const postedBody = () => JSON.parse(String(posts()[0][1]?.body)) as unknown;
const loadedTargets = () =>
  fetchMock.mock.calls.some(([url]) => String(url).startsWith('/api/github/targets'));

// Answers target discovery with the page the handler returns; every other request succeeds.
function serveTargets(page: (kind: string | null, page: number) => Response | object) {
  fetchMock.mockImplementation(async (url) => {
    const parsed = new URL(String(url), 'http://localhost');
    if (parsed.pathname !== '/api/github/targets') return response({});
    const result = page(parsed.searchParams.get('kind'), Number(parsed.searchParams.get('page')));
    if (result instanceof Response) return result;
    return response(result);
  });
}

const repos = (...names: string[]) => names.map((name) => ({ kind: 'repo', name, private: false }));

beforeEach(() => {
  client = createQueryClient();
  client.setQueryData(CONNECTION_KEY, { connected: true, login: 'octocat', message: 'Connected' });
  fetchMock.mockReset();
  serveTargets(() => ({ items: [], next_page: null }));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  client.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function openCreate(options: CreationOptions = {}, onClose = vi.fn()) {
  useRunnerCreationStore.getState().start(options);
  render(
    <QueryClientProvider client={client}>
      <CreateDialog locked={false} onClose={onClose} />
    </QueryClientProvider>,
  );
  return {
    user: userEvent.setup(),
    dialog: within(screen.getByRole('dialog', { name: 'Add runner' })),
  };
}

// Opens token mode for example/build without a GitHub login.
function openTokenCreate() {
  client.setQueryData(CONNECTION_KEY, { connected: false, login: null, message: 'No login' });
  return openCreate({
    initialMode: 'token',
    initialTarget: { kind: 'repo', name: 'example/build' },
  });
}

describe('Add runner scope defaults', () => {
  it('keeps the method step and creates for the selected organization without picking it again', async () => {
    const close = vi.fn();
    const { user, dialog } = openCreate({ initialTarget: { kind: 'org', name: 'example' } }, close);
    expect(dialog.getByRole('heading', { name: 'Registration method' })).toBeVisible();
    expect(loadedTargets()).toBe(false);
    await user.click(dialog.getByRole('button', { name: 'Continue to target' }));
    expect(dialog.getByRole('button', { name: /^Organization:/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(dialog.getByText('example')).toBeVisible();
    await user.click(dialog.getByRole('button', { name: 'Create runner' }));
    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(postedBody()).toEqual({
      kind: 'org',
      target: 'example',
      prefix: 'mactions',
      labels: [],
    });
    await waitFor(() => expect(close).toHaveBeenCalledOnce());
  });

  it('allows a selected repository to be edited in token mode and preserves it through Back', async () => {
    const { user, dialog } = openTokenCreate();
    const target = dialog.getByLabelText('Repository');
    expect(target).toHaveValue('example/build');
    await user.clear(target);
    await user.type(target, 'example/release');
    await user.type(dialog.getByLabelText('Registration token'), 'one-time-token');
    await user.click(dialog.getByRole('button', { name: 'Back' }));
    await user.click(dialog.getByRole('button', { name: 'Continue to target' }));
    expect(dialog.getByLabelText('Repository')).toHaveValue('example/release');
    await user.click(dialog.getByRole('button', { name: 'Create runner' }));
    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(postedBody()).toEqual({
      kind: 'repo',
      target: 'example/release',
      prefix: 'mactions',
      labels: [],
      registration_token: 'one-time-token',
    });
    expect(loadedTargets()).toBe(false);
  });
});

describe('Add runner creation failure', () => {
  it('shows the failure, retries from the footer, and dismisses it with Edit settings or Back', async () => {
    let finishRetry: (response: Response) => void = () => undefined;
    fetchMock.mockImplementation(async (url, options) => {
      if (!isCreate(url, options)) return response({});
      if (posts().length === 2)
        return new Promise<Response>((resolve) => {
          finishRetry = resolve;
        });
      return rejected();
    });
    const { user, dialog } = openTokenCreate();
    await user.type(dialog.getByLabelText('Registration token'), 'one-time-token');
    await user.click(dialog.getByRole('button', { name: 'Create runner' }));
    expect(await dialog.findByRole('alert')).toHaveTextContent('GitHub rejected the token.');

    await user.click(dialog.getByRole('button', { name: 'Create runner' }));
    await waitFor(() => expect(posts()).toHaveLength(2));
    // A pending retry shows the setup notice in the failure's place.
    expect(dialog.queryByRole('alert')).not.toBeInTheDocument();
    expect(dialog.getByText('Setting up your runner')).toBeVisible();
    finishRetry(rejected());
    await waitFor(() => expect(dialog.getByRole('button', { name: 'Back' })).toBeEnabled());
    expect(dialog.getByRole('alert')).toHaveTextContent('GitHub rejected the token.');

    await user.click(dialog.getByRole('button', { name: 'Edit settings' }));
    expect(dialog.queryByRole('alert')).not.toBeInTheDocument();
    expect(dialog.getByLabelText('Registration token')).toHaveValue('one-time-token');

    await user.click(dialog.getByRole('button', { name: 'Create runner' }));
    expect(await dialog.findByRole('alert')).toBeVisible();
    await user.click(dialog.getByRole('button', { name: 'Back' }));
    await user.click(dialog.getByRole('button', { name: 'Continue to target' }));
    expect(dialog.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('Add runner target pagination', () => {
  it('keeps loaded targets, deduplicates later pages, and submits a target from the next page', async () => {
    serveTargets((_kind, page) => {
      if (page === 2)
        return {
          items: [
            { kind: 'repo', name: 'example/build', private: true },
            ...repos('example/release'),
          ],
          next_page: null,
        };
      return { items: repos('example/build'), next_page: 2 };
    });
    const { user, dialog } = openCreate();
    await user.click(dialog.getByRole('button', { name: 'Continue to target' }));
    await waitFor(() =>
      expect(dialog.queryByText('Loading your GitHub targets…')).not.toBeInTheDocument(),
    );
    // Paging details wait until the picker is opened.
    expect(dialog.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
    await user.click(dialog.getByRole('combobox', { name: 'Repository' }));
    expect(await dialog.findByText('Showing 1')).toBeVisible();
    expect(dialog.getByRole('button', { name: 'Create runner' })).toHaveAccessibleDescription(
      'Choose a repository',
    );
    await user.click(await dialog.findByRole('button', { name: 'Load more' }));
    await dialog.findByText('2 repositories');
    expect(dialog.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
    await user.click(dialog.getByRole('combobox', { name: 'Repository' }));
    expect(dialog.getAllByRole('option')).toHaveLength(2);
    expect(dialog.getByRole('option', { name: /example\/build.*Private/ })).toBeVisible();
    await user.click(dialog.getByRole('option', { name: /example\/release/ }));
    await user.click(dialog.getByRole('button', { name: 'Create runner' }));
    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(postedBody()).toMatchObject({ kind: 'repo', target: 'example/release' });
  });

  it('clears the selected target and isolates loaded pages when the scope changes', async () => {
    serveTargets((kind, page) => {
      if (kind === 'org')
        return { items: [{ kind, name: 'example', private: false }], next_page: null };
      if (page === 2) return { items: repos('example/release'), next_page: null };
      return { items: repos('example/build'), next_page: 2 };
    });
    const { user, dialog } = openCreate();
    await user.click(dialog.getByRole('button', { name: 'Continue to target' }));
    await user.click(dialog.getByRole('combobox', { name: 'Repository' }));
    await user.click(await dialog.findByRole('button', { name: 'Load more' }));
    await dialog.findByText('2 repositories');
    await user.click(dialog.getByRole('combobox', { name: 'Repository' }));
    await user.click(dialog.getByRole('option', { name: /example\/release/ }));
    await user.click(dialog.getByRole('button', { name: /^Organization:/ }));
    expect(dialog.getByRole('combobox', { name: 'Organization' })).toHaveValue('');
    expect(dialog.getByRole('button', { name: 'Create runner' })).toBeDisabled();
    expect(dialog.getByText('Choose an organization')).toBeVisible();
    await dialog.findByText('1 organization');
    await user.click(dialog.getByRole('combobox', { name: 'Organization' }));
    expect(dialog.getAllByRole('option')).toHaveLength(1);
    await user.click(dialog.getByRole('option', { name: /example.*Organization/ }));
    await user.click(dialog.getByRole('button', { name: /^Repository:/ }));
    expect(dialog.getByRole('combobox', { name: 'Repository' })).toHaveValue('');
    expect(dialog.getByRole('button', { name: 'Create runner' })).toBeDisabled();
    await user.click(dialog.getByRole('combobox', { name: 'Repository' }));
    expect(dialog.getAllByRole('option')).toHaveLength(2);
    expect(dialog.queryByRole('option', { name: /Organization/ })).not.toBeInTheDocument();
  });

  it.each([
    { failedPage: 1, expectedPages: [1, 1, 2] },
    { failedPage: 2, expectedPages: [1, 2, 2] },
  ])(
    'retries a failed target page $failedPage without dropping loaded targets',
    async ({ failedPage, expectedPages }) => {
      const requestedPages: number[] = [];
      serveTargets((_kind, page) => {
        requestedPages.push(page);
        if (page === failedPage && requestedPages.filter((p) => p === page).length === 1)
          return response({ error: 'Target discovery failed.' }, 500);
        if (page === 1) return { items: repos('example/build'), next_page: 2 };
        return { items: repos('example/release'), next_page: null };
      });
      const { user, dialog } = openCreate();
      const openPicker = () => user.click(dialog.getByRole('combobox', { name: 'Repository' }));
      await user.click(dialog.getByRole('button', { name: 'Continue to target' }));
      if (failedPage === 2) {
        await openPicker();
        await user.click(await dialog.findByRole('option', { name: /example\/build/ }));
        await user.click(dialog.getByRole('button', { name: 'Load more' }));
      }
      const retry = await dialog.findByRole('button', { name: 'Retry' });
      expect(
        dialog.getByText(
          'Could not load targets: Target discovery failed. Check the connection, then retry.',
        ),
      ).toBeVisible();
      if (failedPage === 2)
        expect(dialog.getByRole('button', { name: 'Create runner' })).toBeEnabled();
      await user.click(retry);
      if (failedPage === 1) {
        await openPicker();
        await user.click(await dialog.findByRole('button', { name: 'Load more' }));
      }
      await dialog.findByText('2 repositories');
      expect(requestedPages).toEqual(expectedPages);
      await openPicker();
      expect(dialog.getAllByRole('option')).toHaveLength(2);
    },
  );
});

describe('Data directory dialog', () => {
  function openStorage() {
    render(<StorageDialog path="/Users/me/Library/mactions" onClose={vi.fn()} />);
    return within(screen.getByRole('dialog', { name: 'Data directory' }));
  }

  it('copies the path and confirms it', async () => {
    const writeText = vi.spyOn(navigator.clipboard, 'writeText');
    const dialog = openStorage();
    expect(dialog.queryByText(/Closing this web interface/)).not.toBeInTheDocument();
    await userEvent.click(dialog.getByRole('button', { name: 'Copy path' }));
    expect(writeText).toHaveBeenCalledWith('/Users/me/Library/mactions');
    expect(dialog.getByRole('status')).toHaveTextContent('Path copied.');
    expect(dialog.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('explains a clipboard failure', async () => {
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('Denied'));
    const dialog = openStorage();
    await userEvent.click(dialog.getByRole('button', { name: 'Copy path' }));
    expect(await dialog.findByRole('alert')).toHaveTextContent(
      'Could not copy the path. Select it and copy it manually.',
    );
  });
});
