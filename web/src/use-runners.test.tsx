import { act, renderHook } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { createQueryClient, useRunners } from './use-runners';

const snapshot = { runners: [], operation_running: false, data_directory: '/managed' };
let client: ReturnType<typeof createQueryClient>;
let hidden = false;
const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => {
  vi.useFakeTimers(); hidden = false;
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => hidden ? 'hidden' : 'visible');
  client = createQueryClient();
  fetchMock.mockReset().mockImplementation(async () => new Response(JSON.stringify(snapshot)));
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => { client.clear(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function wrapper({ children }: { children: ReactNode }) { return <QueryClientProvider client={client}>{children}</QueryClientProvider>; }
async function tick(ms: number) { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); }
function visibility(value: boolean) { act(() => { hidden = value; document.dispatchEvent(new Event('visibilitychange')); }); }

it('polls only while visible and refreshes stale state when the page returns', async () => {
  renderHook(useRunners, { wrapper });
  await tick(20); expect(fetchMock).toHaveBeenCalledTimes(1);
  await tick(15_020); expect(fetchMock).toHaveBeenCalledTimes(2);
  visibility(true); const count = fetchMock.mock.calls.length;
  await tick(60_000); expect(fetchMock).toHaveBeenCalledTimes(count);
  visibility(false); await tick(20);
  expect(fetchMock).toHaveBeenCalledTimes(count + 1);
});

it('deduplicates rapid mutations, polls local progress, and lets hidden operations finish', async () => {
  let finish: (response: Response) => void = () => {};
  fetchMock.mockImplementation(async (_url, options) => options?.method === 'POST'
    ? new Promise<Response>(resolve => { finish = resolve; })
    : new Response(JSON.stringify(snapshot)));
  const { result } = renderHook(useRunners, { wrapper });
  await tick(20);
  const operation = { path: '/api/runners/1/stop', payload: {}, message: 'Stopping…' };
  act(() => { result.current.run(operation); result.current.run(operation); });
  await tick(20);
  expect(fetchMock.mock.calls.filter(([, o]) => o?.method === 'POST')).toHaveLength(1);
  await tick(1_520);
  expect(fetchMock.mock.calls.some(([url]) => url === '/api/runners?local=1')).toBe(true);
  visibility(true); const count = fetchMock.mock.calls.length;
  await tick(10_000); expect(fetchMock).toHaveBeenCalledTimes(count);
  await act(async () => { finish(new Response('{}')); }); await tick(20);
  expect(result.current.pending).toBe(false);
  expect(fetchMock).toHaveBeenCalledTimes(count);
  visibility(false); await tick(20);
  expect(fetchMock.mock.calls.at(-1)?.[0]).toBe('/api/runners');
});


it('refreshes remote status faster after stop, then returns to normal polling', async () => {
  const { result } = renderHook(useRunners, { wrapper });
  await tick(20);
  act(() => result.current.run({ path: '/api/runners/1/stop', payload: {}, message: 'Stopping…' }));
  await tick(20);
  const count = fetchMock.mock.calls.length;
  await tick(3_020);
  expect(fetchMock.mock.calls.length).toBeGreaterThan(count);
  expect(fetchMock.mock.calls.at(-1)?.[0]).toBe('/api/runners');
  await tick(61_000);
  const settled = fetchMock.mock.calls.length;
  await tick(3_020);
  expect(fetchMock.mock.calls.length).toBe(settled);
  await tick(15_000);
  expect(fetchMock.mock.calls.length).toBeGreaterThan(settled);
});
