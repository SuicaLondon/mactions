import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { createQueryClient } from '../../../../shared/api/query-client';
import { useRunnerOperationStore } from '../stores/runner-operation-store';
import { useRunnerOperationStatus } from './use-runner-operation-status';
import { useRunnerOperations } from './use-runner-operations';
import { useRunnerPolling } from './use-runner-polling';

// Polls as App does, beside the operation runner that changes the polling rate.
function usePollingHarness() {
  useRunnerPolling();
  const run = useRunnerOperations();
  const { pending } = useRunnerOperationStatus();
  return { run, pending };
}

const snapshot = { runners: [], operation_running: false, data_directory: '/managed' };
const stop = { path: '/api/runners/1/stop', payload: {}, message: 'Stopping…' };

let client: ReturnType<typeof createQueryClient>;
let hidden = false;
const fetchMock = vi.fn<typeof fetch>();
const reads = () => fetchMock.mock.calls.filter(([, options]) => options?.method !== 'POST');

beforeEach(() => {
  useRunnerOperationStore.getState().reset();
  vi.useFakeTimers();
  hidden = false;
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => {
    if (hidden) return 'hidden';
    return 'visible';
  });
  client = createQueryClient();
  fetchMock.mockReset().mockImplementation(async () => new Response(JSON.stringify(snapshot)));
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

async function tick(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

function visibility(value: boolean) {
  act(() => {
    hidden = value;
    document.dispatchEvent(new Event('visibilitychange'));
  });
}

it('polls only while visible and refreshes stale state when the page returns', async () => {
  renderHook(() => usePollingHarness(), { wrapper });
  await tick(20);
  expect(reads()).toHaveLength(1);
  expect(reads()[0][0]).toBe('/api/runners?local=1');
  await tick(15_020);
  expect(reads()).toHaveLength(2);
  visibility(true);
  await tick(60_000);
  expect(reads()).toHaveLength(2);
  visibility(false);
  await tick(20);
  expect(reads()).toHaveLength(3);
});

it('polls faster during an operation and lets a hidden one finish without reading', async () => {
  let finish: (response: Response) => void = () => {};
  fetchMock.mockImplementation(async (_url, options) => {
    if (options?.method === 'POST')
      return new Promise<Response>((resolve) => {
        finish = resolve;
      });
    return new Response(JSON.stringify(snapshot));
  });
  const { result } = renderHook(() => usePollingHarness(), { wrapper });
  await tick(20);
  act(() => result.current.run(stop));
  await tick(20);
  const before = reads().length;
  await tick(1_520);
  expect(reads()).toHaveLength(before + 1);
  visibility(true);
  const hiddenReads = reads().length;
  await tick(10_000);
  await act(async () => {
    finish(new Response('{}'));
  });
  await tick(20);
  expect(result.current.pending).toBe(false);
  expect(reads()).toHaveLength(hiddenReads);
  visibility(false);
  await tick(20);
  expect(reads()).toHaveLength(hiddenReads + 1);
});

it('polls faster for a minute after a stop, then returns to normal polling', async () => {
  const { result } = renderHook(() => usePollingHarness(), { wrapper });
  await tick(20);
  act(() => result.current.run(stop));
  await tick(20);
  const stopped = reads().length;
  await tick(3_020);
  expect(reads().length).toBeGreaterThan(stopped);
  await tick(61_000);
  const settled = reads().length;
  await tick(3_020);
  expect(reads()).toHaveLength(settled);
  await tick(15_000);
  expect(reads().length).toBeGreaterThan(settled);
});
