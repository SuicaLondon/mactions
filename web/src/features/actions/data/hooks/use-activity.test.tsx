import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { createQueryClient } from '../../../../shared/api/query-client';
import type { ActivityRunner } from '../types/activity-types';
import { useRunnerInventory } from './use-runner-inventory';
import { useRunnerWork } from './use-runner-work';
import { useRuns } from './use-runs';

const scope = { organization: '', repository: '' };
const fetchMock = vi.fn<typeof fetch>();
let client: ReturnType<typeof createQueryClient>;
beforeEach(() => {
  vi.useFakeTimers();
  client = createQueryClient();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  client.clear();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
function json(value: unknown) {
  return new Response(JSON.stringify(value));
}
async function tick(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

it('refreshes an empty visible run list so newly started runs can appear without opening details', async () => {
  fetchMock.mockImplementation(async () => json({ runs: [], next_page: null, message: '' }));
  const hook = renderHook(() => useRuns(scope), { wrapper });
  await tick(20);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock.mock.calls[0][0]).toBe('/api/activity/runs?page=1');
  await tick(30_020);
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(fetchMock.mock.calls.every(([url]) => String(url).startsWith('/api/activity/runs?'))).toBe(
    true,
  );
  hook.unmount();
  await tick(60_000);
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it('replaces a local setup fallback with its live later-page inventory record', async () => {
  const fallback: ActivityRunner = {
    github_id: null,
    local_id: 1,
    name: 'my-mac',
    status: 'unknown',
    busy: null,
    labels: [],
    host_type: 'self-hosted',
    device: 'this_device',
    target: { kind: 'org', name: 'example' },
  };
  const live: ActivityRunner = { ...fallback, github_id: 44, status: 'online', busy: true };
  fetchMock.mockImplementation(async (url) => {
    if (String(url).endsWith('page=2')) {
      return json({ runners: [live], next_page: null, message: '' });
    }
    return json({ runners: [fallback], next_page: 2, message: '' });
  });
  const hook = renderHook(() => useRunnerInventory(scope), { wrapper });
  await tick(20);
  expect(hook.result.current.runners).toEqual([fallback]);
  await act(async () => {
    await hook.result.current.query.fetchNextPage();
  });
  await tick(20);
  expect(hook.result.current.runners).toEqual([live]);
});

it('does not fetch inactive runner work and aborts its request when the view becomes inactive', async () => {
  let signal: AbortSignal | null | undefined;
  fetchMock.mockImplementation(async (_url, options) => {
    signal = options?.signal;
    return new Promise<Response>((_resolve, reject) =>
      signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))),
    );
  });
  const hook = renderHook(({ enabled }) => useRunnerWork(scope, enabled), {
    wrapper,
    initialProps: { enabled: false },
  });
  await tick(30_000);
  expect(fetchMock).not.toHaveBeenCalled();
  hook.rerender({ enabled: true });
  await tick(20);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(signal?.aborted).toBe(false);
  hook.rerender({ enabled: false });
  await tick(20);
  expect(signal?.aborted).toBe(true);
  await tick(60_000);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it('requests status on the server and isolates each filtered run list in the cache', async () => {
  fetchMock.mockImplementation(async () => json({ runs: [], next_page: null, message: '' }));
  const hook = renderHook(
    ({ status }) => useRuns({ organization: 'example', repository: 'example/app' }, 44, status),
    { wrapper, initialProps: { status: 'active' } },
  );
  await tick(20);
  const initial = new URL(String(fetchMock.mock.calls[0][0]), 'http://localhost');
  expect(initial.searchParams.get('status')).toBe('active');
  expect(initial.searchParams.get('runner_id')).toBe('44');
  hook.rerender({ status: 'success' });
  await tick(20);
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(
    new URL(String(fetchMock.mock.calls[1][0]), 'http://localhost').searchParams.get('status'),
  ).toBe('success');
  hook.rerender({ status: 'active' });
  await tick(20);
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it('slows infinite inventory refresh by the combined recommendation of every loaded page', async () => {
  fetchMock.mockImplementation(async (url) => {
    if (String(url).endsWith('page=2')) {
      return json({ runners: [], next_page: null, message: '', refresh_after_seconds: 90 });
    }
    return json({ runners: [], next_page: 2, message: '', refresh_after_seconds: 60 });
  });
  const hook = renderHook(() => useRunnerInventory(scope), { wrapper });
  await tick(20);
  expect(hook.result.current.refreshIntervalSeconds).toBe(60);
  await act(async () => {
    await hook.result.current.query.fetchNextPage();
  });
  await tick(20);
  expect(hook.result.current.refreshIntervalSeconds).toBe(150);
  expect(fetchMock).toHaveBeenCalledTimes(2);
  await tick(30_020);
  expect(fetchMock).toHaveBeenCalledTimes(2);
  await tick(120_000);
  expect(fetchMock).toHaveBeenCalledTimes(4);
});

it('uses the work response refresh recommendation while allowing a manual refresh immediately', async () => {
  fetchMock.mockImplementation(async () =>
    json({ runs: [], message: '', refresh_after_seconds: 120 }),
  );
  const hook = renderHook(() => useRunnerWork(scope), { wrapper });
  await tick(20);
  expect(hook.result.current.refreshIntervalSeconds).toBe(120);
  await tick(30_020);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  await act(async () => {
    await hook.result.current.query.refetch();
  });
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it('does not rerender data consumers for unchanged background refreshes', async () => {
  fetchMock.mockImplementation(async () => json({ runs: [], message: '' }));
  let renders = 0;
  const hook = renderHook(
    () => {
      const work = useRunnerWork(scope);
      renders++;
      return { data: work.query.data, refresh: work.query.refetch };
    },
    { wrapper },
  );
  await tick(20);
  const settledRenders = renders;
  await act(async () => {
    await hook.result.current.refresh();
  });
  await tick(20);
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(renders).toBe(settledRenders);
});
