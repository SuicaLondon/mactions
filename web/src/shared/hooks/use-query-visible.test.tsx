import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, expect, it, vi } from 'vitest';

import { createQueryClient } from '../api/query-client';
import { useQueryVisible } from './use-query-visible';

const client = createQueryClient();
afterEach(() => {
  client.clear();
  vi.restoreAllMocks();
});

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

it('aborts only the exact inactive query, leaving other reads in flight', async () => {
  const signals = new Map<number, AbortSignal>();
  for (const id of [1, 2]) {
    void client
      .fetchQuery({
        queryKey: ['logs', id],
        queryFn: ({ signal }) => {
          signals.set(id, signal);
          return new Promise<string>(() => {});
        },
      })
      .catch(() => undefined);
  }
  renderHook(() => useQueryVisible(['logs', 1], false), { wrapper });
  await waitFor(() => expect(signals.get(1)?.aborted).toBe(true));
  expect(signals.get(2)?.aborted).toBe(false);
});

it('does not cancel again when a caller recreates an unchanged query key', () => {
  const cancel = vi.spyOn(client, 'cancelQueries');
  const hook = renderHook(() => useQueryVisible(['logs', 1], false), { wrapper });
  expect(cancel).toHaveBeenCalledTimes(1);
  hook.rerender();
  expect(cancel).toHaveBeenCalledTimes(1);
});
