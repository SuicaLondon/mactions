import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { createQueryClient } from '../../../../shared/api/query-client';
import type { Runner } from '../../../../shared/api/types';
import { runner as harnessRunner } from '../../../../test/app-harness';
import { RunnerActivity } from './RunnerActivity';

const runner: Runner = { ...harnessRunner, busy: true };
const logSnapshot = {
  files: [],
  selected: 'service.log',
  content: 'Diagnostic output',
  truncated: false,
  total_bytes: 17,
};
const job = {
  id: 7,
  name: 'Build application',
  status: 'in_progress',
  conclusion: null,
  started_at: '2026-09-30T01:00:00Z',
  completed_at: null,
  workflow: 'CI',
  branch: 'main',
  run_number: 42,
  url: 'https://github.com/example/app/actions/runs/1/job/7',
  steps: [],
};
const unavailable = 'Service is temporarily unavailable.';

const fetchMock = vi.fn<typeof fetch>();

let client: ReturnType<typeof createQueryClient>;

let hidden = false;
let failing = false;

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });

// Serves diagnostics, and jobs when given; `failing` fails jobs if served, otherwise diagnostics.
function serve(jobs?: object) {
  fetchMock.mockImplementation(async (url) => {
    const isJobs = String(url).startsWith('/api/runners/1/jobs');
    if (failing && (jobs === undefined || isJobs)) return json({ error: unavailable }, 503);
    if (isJobs) return json(jobs);
    return json(logSnapshot);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  client = createQueryClient();
  hidden = false;
  failing = false;
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => {
    if (hidden) return 'hidden';
    return 'visible';
  });
  fetchMock.mockReset();
  serve();
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

function setHidden(value: boolean) {
  act(() => {
    hidden = value;
    document.dispatchEvent(new Event('visibilitychange'));
  });
}

function mount(props: { runner?: Runner; logsOnly?: boolean } = { logsOnly: true }) {
  return render(
    <QueryClientProvider client={client}>
      <RunnerActivity runner={props.runner ?? runner} connected logsOnly={props.logsOnly} />
    </QueryClientProvider>,
  );
}

const failureNotice = () =>
  screen.getByText('Update failed').closest<HTMLElement>('[role="status"]')!;

async function retry(container: HTMLElement) {
  failing = false;
  act(() => within(container).getByRole('button', { name: 'Retry', hidden: true }).click());
  await tick(20);
}

it('loads diagnostics only, pauses while hidden, and stops polling when closed', async () => {
  const view = mount();
  await tick(20);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  await tick(2_020);
  expect(fetchMock).toHaveBeenCalledTimes(2);
  setHidden(true);
  await tick(30_000);
  expect(fetchMock).toHaveBeenCalledTimes(2);
  setHidden(false);
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
  setHidden(true);
  await tick(20);
  expect(signal?.aborted).toBe(true);
});

it('keeps runner jobs visible when the 30s poll fails and offers an inline retry', async () => {
  serve({ jobs: [job], repository: 'example/app', message: '' });
  mount({});
  await tick(20);
  expect(screen.getByText('Updates every 30s')).toBeInTheDocument();
  failing = true;
  await tick(30_000);
  const notice = failureNotice();
  expect(notice).toHaveAttribute('title', unavailable);
  expect(screen.getByText('example/app')).toBeInTheDocument();
  expect(screen.getAllByText('Build application').length).toBeGreaterThan(0);
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  await retry(notice);
  expect(screen.queryByText('Update failed')).not.toBeInTheDocument();
  expect(screen.getByText('Updates every 30s')).toBeInTheDocument();
});

it('keeps diagnostic output in place when a live poll fails and retries from the controls', async () => {
  mount();
  await tick(20);
  const output = screen.getByLabelText('Runner log output');
  const notice = failureNotice();
  expect(notice).toHaveAttribute('aria-hidden', 'true');
  failing = true;
  await tick(2_020);
  expect(notice).toHaveAttribute('title', unavailable);
  expect(notice).not.toHaveAttribute('aria-hidden');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Runner log output')).toBe(output);
  expect(output).toHaveTextContent('Diagnostic output');
  await retry(notice);
  expect(notice).toHaveAttribute('aria-hidden', 'true');
});

it('offers a retry in place of the output when diagnostics never loaded', async () => {
  failing = true;
  mount();
  await tick(20);
  const alert = screen.getByRole('alert');
  expect(alert).toHaveTextContent("Couldn't load runner logs");
  expect(alert).toHaveTextContent(unavailable);
  expect(screen.queryByLabelText('Runner log output')).not.toBeInTheDocument();
  await retry(alert);
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Runner log output')).toHaveTextContent('Diagnostic output');
});

it('reports a failed jobs refresh while asking for a repository', async () => {
  serve({ jobs: [], repository: '', message: '', needs_repository: true });
  mount({ runner: { ...runner, target: { kind: 'org', name: 'example' } } });
  await tick(20);
  expect(screen.getByText('Choose a repository to view jobs.')).toBeInTheDocument();
  const notice = failureNotice();
  expect(notice).toHaveAttribute('aria-hidden', 'true');
  failing = true;
  await tick(30_000);
  expect(notice).toHaveAttribute('title', unavailable);
  expect(notice).not.toHaveAttribute('aria-hidden');
  expect(screen.getByText('Choose a repository to view jobs.')).toBeInTheDocument();
});
