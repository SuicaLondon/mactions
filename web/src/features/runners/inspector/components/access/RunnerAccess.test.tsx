import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { createQueryClient } from '../../../../../shared/api/query-client';
import type { Capabilities } from '../../../../../shared/api/types';
import { RunnerAccess } from './RunnerAccess';

const capabilities: Capabilities = {
  runner_status: { state: 'available', message: 'Runner status is readable.' },
  jobs: { state: 'available', message: '' },
  manage: { state: 'available', message: '' },
  local: { state: 'available', message: '' },
  links: [],
};
const fetchMock = vi.fn<typeof fetch>();
let client: ReturnType<typeof createQueryClient>;

beforeEach(() => {
  client = createQueryClient();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  client.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function openAccess() {
  render(
    <QueryClientProvider client={client}>
      <RunnerAccess runnerId={1} connected />
    </QueryClientProvider>,
  );
  const details = screen.getByText('GitHub access').closest('details')!;
  details.open = true;
  fireEvent(details, new Event('toggle'));
}

function failure(message: string) {
  return new Response(JSON.stringify({ error: message }), { status: 401 });
}

const ok = () => new Response(JSON.stringify(capabilities));

// The indicator holds its place beside the button, hidden, until a re-check fails.
const checkFailed = () => screen.getByText('Check failed').closest<HTMLElement>('[role="status"]')!;

it('keeps the last access result during a re-check and reports a failure on the button row', async () => {
  let release: (response: Response) => void = () => undefined;
  fetchMock.mockResolvedValueOnce(ok());
  openAccess();
  expect(await screen.findByText('Runner status is readable.')).toBeVisible();
  const button = screen.getByRole('button', { name: 'Check access again' });
  const indicator = checkFailed();
  expect(indicator).toHaveAttribute('aria-hidden', 'true');

  fetchMock.mockImplementationOnce(
    () =>
      new Promise<Response>((resolve) => {
        release = resolve;
      }),
  );
  await userEvent.click(button);
  await waitFor(() => expect(button).toHaveAccessibleName('Checking…'));
  expect(screen.getByText('Runner status is readable.')).toBeVisible();
  expect(screen.queryByRole('status', { name: 'Checking GitHub access…' })).toBeNull();

  release(failure('Token expired.'));
  await waitFor(() => expect(indicator).not.toHaveAttribute('aria-hidden'));
  expect(indicator).toHaveAttribute('title', 'Token expired.');
  expect(screen.queryByRole('alert')).toBeNull();
  expect(screen.getByText('Runner status is readable.')).toBeVisible();
  expect(button).toHaveAccessibleName('Check access again');

  fetchMock.mockResolvedValueOnce(ok());
  await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
  await waitFor(() => expect(indicator).toHaveAttribute('aria-hidden', 'true'));
});

it('explains a first-load failure in place of the loading placeholder', async () => {
  fetchMock.mockResolvedValueOnce(failure('Missing capabilities'));
  openAccess();
  expect(await screen.findByRole('alert')).toHaveTextContent(
    "Couldn't check GitHub access. Missing capabilities. Use Check access again to retry.",
  );
  expect(screen.queryByRole('status', { name: 'Checking GitHub access…' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Check access again' })).toBeVisible();
  expect(checkFailed()).toHaveAttribute('aria-hidden', 'true');
});
