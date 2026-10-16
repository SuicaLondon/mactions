import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { createQueryClient } from '../../../shared/api/query-client';
import type { Targets } from '../../../shared/api/types';
import { ScopePicker } from './ScopePicker';

let client: ReturnType<typeof createQueryClient>;
const fetchMock = vi.fn<typeof fetch>();
const json = (value: Targets) =>
  new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });
const failure = () =>
  new Response(JSON.stringify({ error: 'GitHub is unavailable.' }), { status: 502 });

beforeEach(() => {
  client = createQueryClient();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  client.clear();
  vi.unstubAllGlobals();
});

function mount() {
  render(
    <QueryClientProvider client={client}>
      <ScopePicker
        kind="repo"
        scope={{ organization: '', repository: '' }}
        local={[]}
        connected
        onChange={vi.fn()}
      />
    </QueryClientProvider>,
  );
}

it('explains a failed first load on the open and closed picker and retries on reopen', async () => {
  fetchMock.mockResolvedValue(failure());
  mount();
  const user = userEvent.setup();
  const picker = screen.getByRole('combobox', { name: 'Filter repository' });
  await user.click(picker);
  expect(await screen.findByRole('alert')).toHaveTextContent(
    "Couldn't load choices. GitHub is unavailable. Check the GitHub connection, then retry.",
  );
  expect(screen.queryByText(/No matching options/)).not.toBeInTheDocument();
  await user.keyboard('{Escape}');
  expect(screen.getByText("Couldn't load · open to retry")).toBeVisible();
  expect(screen.getByText('Repo').closest('[data-select-anchor]')).toHaveAttribute(
    'title',
    "Couldn't load choices. GitHub is unavailable.",
  );
  fetchMock.mockResolvedValue(
    json({ items: [{ kind: 'repo', name: 'example/app', private: false }], next_page: null }),
  );
  // Reopening the picker retries the load.
  await user.click(picker);
  expect(await screen.findByRole('option', { name: /example\/app/ })).toBeVisible();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it('retries the next page when loading more fails', async () => {
  fetchMock.mockResolvedValueOnce(
    json({ items: [{ kind: 'repo', name: 'example/app', private: false }], next_page: 2 }),
  );
  mount();
  const user = userEvent.setup();
  await user.click(screen.getByRole('combobox', { name: 'Filter repository' }));
  fetchMock.mockResolvedValueOnce(failure());
  await user.click(await screen.findByRole('option', { name: 'Load more repositories' }));
  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent("Couldn't load more choices.");
  fetchMock.mockResolvedValueOnce(
    json({ items: [{ kind: 'repo', name: 'example/api', private: false }], next_page: null }),
  );
  await user.click(within(alert).getByRole('button', { name: 'Retry' }));
  expect(await screen.findByRole('option', { name: /example\/api/ })).toBeVisible();
  expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain('page=2');
});

it('ends a server message without punctuation before the next step', async () => {
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify({ error: 'Cannot list repo targets' }), { status: 502 }),
  );
  mount();
  const user = userEvent.setup();
  await user.click(screen.getByRole('combobox', { name: 'Filter repository' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    "Couldn't load choices. Cannot list repo targets. Check the GitHub connection, then retry.",
  );
});
