import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { createQueryClient } from '../../../../shared/api/query-client';
import { RUNNERS_KEY } from '../models/runner-snapshot-query';
import { useRunnerOperationStore } from '../stores/runner-operation-store';
import { useRunnerOperationStatus } from './use-runner-operation-status';
import { useRunnerOperations } from './use-runner-operations';

// Starts operations and reads the shared status and notice, as the app's views do.
function useOperationHarness() {
  const run = useRunnerOperations();
  const status = useRunnerOperationStatus();
  const notice = useRunnerOperationStore((state) => state.notice);
  const dismissNotice = useRunnerOperationStore((state) => state.dismissNotice);
  return { run, ...status, notice, dismissNotice };
}

const snapshot = { runners: [], operation_running: false, data_directory: '/managed' };
const stop = { path: '/api/runners/1/stop', payload: {}, message: 'Stopping…' };

let client: ReturnType<typeof createQueryClient>;
const fetchMock = vi.fn<typeof fetch>();
const posts = () => fetchMock.mock.calls.filter(([, options]) => options?.method === 'POST');

beforeEach(() => {
  useRunnerOperationStore.getState().reset();
  vi.useFakeTimers();
  client = createQueryClient();
  fetchMock.mockReset().mockImplementation(async () => new Response('{}'));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  client.clear();
  vi.useRealTimers();
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

it('starts one operation even when asked twice before React renders', async () => {
  fetchMock.mockImplementation(() => new Promise<Response>(() => {}));
  const { result } = renderHook(() => useOperationHarness(), { wrapper });
  act(() => {
    result.current.run(stop);
    result.current.run(stop);
  });
  await tick(20);
  expect(posts()).toHaveLength(1);
});

it('waits while another browser or the CLI holds the operation lock', async () => {
  client.setQueryData(RUNNERS_KEY, { ...snapshot, operation_running: true });
  const { result } = renderHook(() => useOperationHarness(), { wrapper });
  act(() => result.current.run(stop));
  await tick(20);
  expect(posts()).toHaveLength(0);
  expect(result.current.notice).toBeNull();
});

it('reports operation progress, success, and dismissal through one notice', async () => {
  const { result } = renderHook(() => useOperationHarness(), { wrapper });
  const onSuccess = vi.fn();
  act(() =>
    result.current.run(
      { path: '/api/runners/1/start', payload: {}, message: 'Starting…' },
      { onSuccess },
    ),
  );
  expect(result.current.notice).toMatchObject({ state: 'progress', message: 'Starting…' });
  expect(result.current.active?.path).toBe('/api/runners/1/start');
  await tick(20);
  expect(onSuccess).toHaveBeenCalled();
  expect(result.current.active).toBeUndefined();
  const notice = result.current.notice;
  expect(notice?.state).toBe('success');
  act(() => result.current.dismissNotice(notice?.id ?? -1));
  expect(result.current.notice).toBeNull();
});

it('leaves failures to callers that report them in place', async () => {
  fetchMock.mockImplementation(async () => {
    throw new TypeError('Failed to fetch');
  });
  const { result } = renderHook(() => useOperationHarness(), { wrapper });
  const onError = vi.fn();
  act(() => result.current.run(stop, { reportsErrors: true, onError }));
  await tick(20);
  expect(onError).toHaveBeenCalledWith(expect.stringContaining('the result is unknown'));
  expect(result.current.notice).toBeNull();
  act(() => result.current.run(stop));
  await tick(20);
  expect(result.current.notice).toMatchObject({ state: 'error' });
});

it('reports a failure after the component that started the operation unmounts', async () => {
  let fail: (response: Response) => void = () => {};
  fetchMock.mockImplementation(
    () =>
      new Promise<Response>((resolve) => {
        fail = resolve;
      }),
  );
  const starter = renderHook(() => useRunnerOperations(), { wrapper });
  const onError = vi.fn();
  act(() => starter.result.current(stop, { reportsErrors: true, onError }));
  await tick(20);
  starter.unmount();
  await act(async () => {
    fail(new Response(JSON.stringify({ error: 'launchctl failed' }), { status: 500 }));
  });
  await tick(20);
  expect(onError).not.toHaveBeenCalled();
  expect(useRunnerOperationStore.getState().notice).toMatchObject({
    state: 'error',
    message: 'launchctl failed',
  });
});
