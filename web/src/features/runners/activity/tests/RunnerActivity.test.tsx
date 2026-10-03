import { QueryClientProvider } from '@tanstack/react-query';
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { createQueryClient } from '../../../../shared/api/query-client';
import type { Runner } from '../../../../shared/api/types';
import { RunnerActivity } from '../components/RunnerActivity';

const runner: Runner = {
  id: 1,
  name: 'my-mac',
  target: { kind: 'repo', name: 'example/app' },
  labels: [],
  path: '/managed/runner',
  version: '1',
  github_id: 44,
  enabled: true,
  phase: 'ready',
  error: null,
  deregistered: false,
  registration_attempted: true,
  local_status: 'running',
  github_status: 'online',
  busy: true,
  interrupted: false,
};

const fetchMock = vi.fn<typeof fetch>();

let client: ReturnType<typeof createQueryClient>;

let hidden = false;

beforeEach(() => {
  vi.useFakeTimers();
  client = createQueryClient();
  hidden = false;
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => {
    if (hidden) return 'hidden';
    return 'visible';
  });
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  client.clear();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function tick(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

function mount() {
  return render(
    <QueryClientProvider client={client}>
      <RunnerActivity runner={runner} connected logsOnly />
    </QueryClientProvider>,
  );
}

it('loads diagnostics only, pauses while hidden, and stops polling when closed', async () => {
  fetchMock.mockImplementation(
    async () =>
      new Response(
        JSON.stringify({
          files: [],
          selected: 'service.log',
          content: 'Diagnostic output',
          truncated: false,
          total_bytes: 17,
        }),
      ),
  );
  const view = mount();
  await tick(20);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock.mock.calls[0][0]).toBe('/api/runners/1/logs');
  await tick(2_020);
  expect(fetchMock).toHaveBeenCalledTimes(2);
  act(() => {
    hidden = true;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await tick(30_000);
  expect(fetchMock).toHaveBeenCalledTimes(2);
  act(() => {
    hidden = false;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await tick(20);
  expect(fetchMock).toHaveBeenCalledTimes(3);
  view.unmount();
  await tick(30_000);
  expect(fetchMock).toHaveBeenCalledTimes(3);
  expect(fetchMock.mock.calls.every(([url]) => String(url) === '/api/runners/1/logs')).toBe(true);
});

it('aborts a pending diagnostic read when the page is hidden', async () => {
  let signal: AbortSignal | null | undefined;
  fetchMock.mockImplementation(async (_url, options) => {
    signal = options?.signal;
    return new Promise<Response>((_resolve, reject) =>
      signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))),
    );
  });
  mount();
  await tick(20);
  expect(signal?.aborted).toBe(false);
  act(() => {
    hidden = true;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await tick(20);
  expect(signal?.aborted).toBe(true);
});
