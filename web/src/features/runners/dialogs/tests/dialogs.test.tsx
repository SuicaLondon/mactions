import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createQueryClient } from '../../../../shared/api/query-client';
import { CONNECTION_KEY } from '../../../github/hooks/connection/use-connection';
import { CreateDialog } from '../../creation/components/CreateDialog';

const fetchMock = vi.fn<typeof fetch>();

let client: ReturnType<typeof createQueryClient>;

function response(data: unknown) {
  return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
}

const posts = () =>
  fetchMock.mock.calls.filter(
    ([url, options]) => url === '/api/runners' && options?.method === 'POST',
  );

beforeEach(() => {
  client = createQueryClient();
  client.setQueryData(CONNECTION_KEY, { connected: true, login: 'octocat', message: 'Connected' });
  fetchMock.mockReset().mockImplementation(async (url) => {
    if (String(url).startsWith('/api/github/targets'))
      return response({ items: [], next_page: null });
    return response({});
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  client.clear();
  vi.unstubAllGlobals();
});

describe('Add Runner scope defaults', () => {
  it('keeps the method step and creates for the selected organization without picking it again', async () => {
    const close = vi.fn();
    render(
      <QueryClientProvider client={client}>
        <CreateDialog
          locked={false}
          onClose={close}
          initialTarget={{ kind: 'org', name: 'example' }}
        />
      </QueryClientProvider>,
    );
    const dialog = within(screen.getByRole('dialog', { name: 'Add Runner' }));
    expect(dialog.getByRole('heading', { name: 'Registration Method' })).toBeVisible();
    expect(
      fetchMock.mock.calls.some(([url]) => String(url).startsWith('/api/github/targets')),
    ).toBe(false);
    await userEvent.click(dialog.getByRole('button', { name: 'Continue to Target' }));
    expect(dialog.getByRole('button', { name: /^Organization:/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(dialog.getByText('example')).toBeVisible();
    await userEvent.click(dialog.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(JSON.parse(String(posts()[0][1]?.body))).toEqual({
      kind: 'org',
      target: 'example',
      prefix: 'mactions',
      labels: [],
    });
    await waitFor(() => expect(close).toHaveBeenCalledOnce());
  });

  it('allows a selected repository to be edited in token mode and preserves it through Back', async () => {
    client.setQueryData(CONNECTION_KEY, {
      connected: false,
      login: null,
      message: 'Not connected',
    });
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={client}>
        <CreateDialog
          locked={false}
          onClose={vi.fn()}
          initialMode="token"
          initialTarget={{ kind: 'repo', name: 'example/build' }}
        />
      </QueryClientProvider>,
    );
    const dialog = within(screen.getByRole('dialog', { name: 'Add Runner' }));
    const target = dialog.getByLabelText('Repository');
    expect(target).toHaveValue('example/build');
    await user.clear(target);
    await user.type(target, 'example/release');
    await user.type(dialog.getByLabelText('Registration token'), 'one-time-token');
    await user.click(dialog.getByRole('button', { name: 'Back' }));
    await user.click(dialog.getByRole('button', { name: 'Continue to Target' }));
    expect(dialog.getByLabelText('Repository')).toHaveValue('example/release');
    await user.click(dialog.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(JSON.parse(String(posts()[0][1]?.body))).toEqual({
      kind: 'repo',
      target: 'example/release',
      prefix: 'mactions',
      labels: [],
      registration_token: 'one-time-token',
    });
    expect(
      fetchMock.mock.calls.some(([url]) => String(url).startsWith('/api/github/targets')),
    ).toBe(false);
  });
});

describe('Add Runner target pagination', () => {
  it('keeps loaded targets, deduplicates later pages, and submits a target from the next page', async () => {
    fetchMock.mockImplementation(async (url) => {
      const parsed = new URL(String(url), 'http://localhost');
      if (parsed.pathname !== '/api/github/targets') return response({});
      const secondPage = parsed.searchParams.get('page') === '2';
      if (secondPage)
        return response({
          items: [
            { kind: 'repo', name: 'example/build', private: true },
            { kind: 'repo', name: 'example/release', private: false },
          ],
          next_page: null,
        });
      return response({
        items: [{ kind: 'repo', name: 'example/build', private: false }],
        next_page: 2,
      });
    });
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={client}>
        <CreateDialog locked={false} onClose={vi.fn()} />
      </QueryClientProvider>,
    );
    const dialog = within(screen.getByRole('dialog', { name: 'Add Runner' }));
    await user.click(dialog.getByRole('button', { name: 'Continue to Target' }));
    await user.click(await dialog.findByRole('button', { name: 'Load More Targets' }));
    await dialog.findByText('2 targets loaded');
    expect(dialog.queryByRole('button', { name: 'Load More Targets' })).not.toBeInTheDocument();
    await user.click(dialog.getByRole('combobox', { name: 'Repository' }));
    expect(dialog.getAllByRole('option')).toHaveLength(2);
    expect(dialog.getByRole('option', { name: /example\/build.*Private/ })).toBeVisible();
    await user.click(dialog.getByRole('option', { name: /example\/release/ }));
    await user.click(dialog.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(JSON.parse(String(posts()[0][1]?.body))).toMatchObject({
      kind: 'repo',
      target: 'example/release',
    });
  });

  it('clears the selected target and isolates loaded pages when the scope changes', async () => {
    fetchMock.mockImplementation(async (url) => {
      const parsed = new URL(String(url), 'http://localhost');
      if (parsed.pathname !== '/api/github/targets') return response({});
      const kind = parsed.searchParams.get('kind');
      const secondPage = parsed.searchParams.get('page') === '2';
      let name = 'example/build';
      if (secondPage) name = 'example/release';
      if (kind === 'org') name = 'example';
      let nextPage: number | null = null;
      if (kind === 'repo' && !secondPage) nextPage = 2;
      return response({
        items: [{ kind, name, private: false }],
        next_page: nextPage,
      });
    });
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={client}>
        <CreateDialog locked={false} onClose={vi.fn()} />
      </QueryClientProvider>,
    );
    const dialog = within(screen.getByRole('dialog', { name: 'Add Runner' }));
    await user.click(dialog.getByRole('button', { name: 'Continue to Target' }));
    await user.click(await dialog.findByRole('button', { name: 'Load More Targets' }));
    await dialog.findByText('2 targets loaded');
    await user.click(dialog.getByRole('combobox', { name: 'Repository' }));
    await user.click(dialog.getByRole('option', { name: /example\/release/ }));
    await user.click(dialog.getByRole('button', { name: /^Organization:/ }));
    expect(dialog.getByRole('combobox', { name: 'Organization' })).toHaveValue('');
    expect(dialog.getByRole('button', { name: 'Next' })).toBeDisabled();
    await dialog.findByText('1 targets loaded');
    await user.click(dialog.getByRole('combobox', { name: 'Organization' }));
    expect(dialog.getAllByRole('option')).toHaveLength(1);
    expect(dialog.getByRole('option', { name: /example.*Organization/ })).toBeVisible();
    expect(dialog.queryByRole('option', { name: /example\// })).not.toBeInTheDocument();
    await user.click(dialog.getByRole('option', { name: /example.*Organization/ }));
    await user.click(dialog.getByRole('button', { name: /^Repository:/ }));
    expect(dialog.getByRole('combobox', { name: 'Repository' })).toHaveValue('');
    expect(dialog.getByRole('button', { name: 'Next' })).toBeDisabled();
    await user.click(dialog.getByRole('combobox', { name: 'Repository' }));
    expect(dialog.getAllByRole('option')).toHaveLength(2);
    expect(dialog.queryByRole('option', { name: /Organization/ })).not.toBeInTheDocument();
  });

  it.each([1, 2])(
    'retries a failed target page %i without dropping loaded targets',
    async (failedPage) => {
      const requestedPages: number[] = [];
      let failed = false;
      fetchMock.mockImplementation(async (url) => {
        const parsed = new URL(String(url), 'http://localhost');
        if (parsed.pathname !== '/api/github/targets') return response({});
        const page = Number(parsed.searchParams.get('page'));
        requestedPages.push(page);
        if (page === failedPage && !failed) {
          failed = true;
          return new Response(JSON.stringify({ error: 'Target discovery failed.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        let name = 'example/release';
        let nextPage: number | null = null;
        if (page === 1) {
          name = 'example/build';
          nextPage = 2;
        }
        return response({
          items: [{ kind: 'repo', name, private: false }],
          next_page: nextPage,
        });
      });
      const user = userEvent.setup();
      render(
        <QueryClientProvider client={client}>
          <CreateDialog locked={false} onClose={vi.fn()} />
        </QueryClientProvider>,
      );
      const dialog = within(screen.getByRole('dialog', { name: 'Add Runner' }));
      await user.click(dialog.getByRole('button', { name: 'Continue to Target' }));
      if (failedPage === 2) {
        await user.click(dialog.getByRole('combobox', { name: 'Repository' }));
        await user.click(await dialog.findByRole('option', { name: /example\/build/ }));
        await user.click(dialog.getByRole('button', { name: 'Load More Targets' }));
      }
      const retry = await dialog.findByRole('button', { name: 'Retry' });
      expect(dialog.getByText('Could not load targets. Please retry.')).toBeVisible();
      if (failedPage === 2) {
        expect(dialog.getByText('example/build')).toBeVisible();
        expect(dialog.getByRole('button', { name: 'Next' })).toBeEnabled();
      }
      await user.click(retry);
      if (failedPage === 1)
        await user.click(await dialog.findByRole('button', { name: 'Load More Targets' }));
      await dialog.findByText('2 targets loaded');
      let expectedPages = [1, 2, 2];
      if (failedPage === 1) expectedPages = [1, 1, 2];
      expect(requestedPages).toEqual(expectedPages);
      await user.click(dialog.getByRole('combobox', { name: 'Repository' }));
      expect(dialog.getAllByRole('option')).toHaveLength(2);
    },
  );
});
