import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { createQueryClient } from '../../../shared/api/query-client';
import type { LoginAttempt } from '../../../shared/api/types';
import { useGitHubAuthorization } from './use-github-authorization';

const fetchMock = vi.fn<typeof fetch>();
let client: ReturnType<typeof createQueryClient>;

// Each GET of the attempt returns the next status, then keeps the last one.
function serveStatuses(...statuses: LoginAttempt['status'][]) {
  let reads = 0;
  fetchMock.mockImplementation(async () => {
    const attempt: LoginAttempt = {
      status: statuses[Math.min(reads, statuses.length - 1)],
      code: null,
      url: '',
    };
    reads += 1;
    return new Response(JSON.stringify(attempt));
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  client = createQueryClient();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  client.clear();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function renderAuthorization(onCompleted: () => void) {
  renderHook(() => useGitHubAuthorization({ organizationScope: true, onCompleted }), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
}

async function tick(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

it('ignores a sign-in that finished before it mounted', async () => {
  serveStatuses('complete');
  const onCompleted = vi.fn();
  renderAuthorization(onCompleted);
  await tick(20);
  expect(fetchMock).toHaveBeenCalled();
  expect(onCompleted).not.toHaveBeenCalled();
});

it('completes an attempt it saw in progress once', async () => {
  serveStatuses('pending', 'complete');
  const onCompleted = vi.fn();
  renderAuthorization(onCompleted);
  await tick(20);
  expect(onCompleted).not.toHaveBeenCalled();
  await tick(1_520);
  expect(onCompleted).toHaveBeenCalledOnce();
  await tick(3_000);
  expect(onCompleted).toHaveBeenCalledOnce();
});
