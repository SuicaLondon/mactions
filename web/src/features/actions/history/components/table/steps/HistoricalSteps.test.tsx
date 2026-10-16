import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { createQueryClient } from '../../../../../../shared/api/query-client';
import { makeJob } from '../../../../../../test/activity-fixtures';
import { HistoricalSteps } from './HistoricalSteps';

let client: ReturnType<typeof createQueryClient>;
const fetchMock = vi.fn<typeof fetch>();
const json = (value: unknown) =>
  new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });
const failure = () =>
  new Response(JSON.stringify({ error: 'GitHub is unavailable.' }), { status: 502 });
const job = makeJob({
  id: 7,
  steps: [{ number: 1, name: 'Compile', status: 'completed', conclusion: 'success' }],
});

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
      <HistoricalSteps repository="example/app" jobId={7} />
    </QueryClientProvider>,
  );
}

it('explains a failed first load and retries it', async () => {
  fetchMock.mockResolvedValueOnce(failure());
  mount();
  const alert = await screen.findByRole('alert');
  expect(within(alert).getByText("Couldn't load step results")).toBeVisible();
  expect(within(alert).getByText('GitHub is unavailable.')).toBeVisible();
  fetchMock.mockResolvedValue(json(job));
  await userEvent.click(within(alert).getByRole('button', { name: 'Retry' }));
  expect(await screen.findByRole('rowheader', { name: 'Compile' })).toBeVisible();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it('keeps loaded steps in place and reports a failed refresh in the caption row', async () => {
  fetchMock.mockResolvedValueOnce(json(job));
  mount();
  const table = await screen.findByRole('table', { name: /Step results and duration/ });
  // The indicator is always rendered, hidden while there is no error.
  const indicator = within(table).getByRole('status', { hidden: true });
  expect(indicator).toHaveAttribute('aria-hidden', 'true');
  fetchMock.mockResolvedValue(failure());
  await act(() => client.refetchQueries());
  await waitFor(() => expect(indicator).not.toHaveAttribute('aria-hidden'));
  expect(indicator).toHaveAttribute('title', 'GitHub is unavailable.');
  expect(within(table).getByRole('rowheader', { name: 'Compile' })).toBeVisible();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
