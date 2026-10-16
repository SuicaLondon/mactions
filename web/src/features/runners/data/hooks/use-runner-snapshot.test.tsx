import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { createQueryClient } from '../../../../shared/api/query-client';
import { runnerSnapshotQuery } from '../models/runner-snapshot-query';
import { useRunnerPolling } from './use-runner-polling';
import { useRunnerSnapshot } from './use-runner-snapshot';

function Polling() {
  useRunnerPolling();
  return null;
}

// Shows one selected value and counts its renders.
function OperationReader({ onRender }: { onRender: () => void }) {
  const running = useRunnerSnapshot((snapshot) => snapshot.operation_running);
  onRender();
  return <output aria-label="Operation running">{String(running)}</output>;
}

// The manager's JSON reply; only its runner count and operation flag matter here.
interface Reply {
  runners: { id: number; name: string }[];
  operation_running: boolean;
  data_directory: string;
}

let reply: Reply;
let client: ReturnType<typeof createQueryClient>;

beforeEach(() => {
  reply = { runners: [], operation_running: false, data_directory: '/managed' };
  vi.useFakeTimers();
  client = createQueryClient();
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(reply))),
  );
});

afterEach(() => {
  client.clear();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function tick(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

it('rerenders a reader only when its selected value changes', async () => {
  const onRender = vi.fn();
  render(
    <QueryClientProvider client={client}>
      <Polling />
      <OperationReader onRender={onRender} />
    </QueryClientProvider>,
  );
  await tick(20);
  expect(screen.getByLabelText('Operation running')).toHaveTextContent('false');
  const loaded = onRender.mock.calls.length;
  reply = { ...reply, runners: [{ id: 1, name: 'mactions-1' }] };
  await tick(15_020);
  expect(client.getQueryData(runnerSnapshotQuery.queryKey)?.runners).toHaveLength(1);
  expect(onRender).toHaveBeenCalledTimes(loaded);
  reply = { ...reply, operation_running: true };
  await tick(15_020);
  expect(screen.getByLabelText('Operation running')).toHaveTextContent('true');
});
