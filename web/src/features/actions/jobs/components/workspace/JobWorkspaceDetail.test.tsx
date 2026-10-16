import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { createQueryClient } from '../../../../../shared/api/query-client';
import type { Job, JobLogs } from '../../../../../shared/api/types';
import { makeJob } from '../../../../../test/activity-fixtures';
import { JobWorkspaceDetail } from './JobWorkspaceDetail';

const job = makeJob({
  id: 900,
  name: 'Build application',
  steps: [
    { number: 2, name: 'Compile', status: 'completed', conclusion: 'success' },
    { number: 8, name: 'Test', status: 'completed', conclusion: 'success' },
    { number: 9, name: 'Publish', status: 'completed', conclusion: 'success' },
  ],
});
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

function view(selectedStepNumber?: number, shown: Job = job, onSelectStep = vi.fn()) {
  return (
    <QueryClientProvider client={client}>
      <JobWorkspaceDetail
        job={shown}
        repository="example/app"
        selectedStepNumber={selectedStepNumber}
        onOpenHistory={vi.fn()}
        onSelectStep={onSelectStep}
      />
    </QueryClientProvider>
  );
}
function logs(content: string, fields: Partial<JobLogs> = {}) {
  return new Response(
    JSON.stringify({ state: 'available', content, message: '', steps: [], ...fields }),
  );
}
/** Answers each step log read with `Output for step <n>`. */
function serveStepOutput() {
  fetchMock.mockImplementation(async (url) => logs(`Output for step ${stepOf(url)}`));
}
function stepOf(url: unknown) {
  return new URL(String(url), 'http://localhost').searchParams.get('step_number');
}
const refresh = () => screen.getByRole('button', { name: 'Refresh logs for compile' });

it('does not request logs for the Job overview until full output is opened', async () => {
  fetchMock.mockResolvedValue(logs('Complete job output'));
  render(view());
  expect(screen.getByRole('table', { name: 'Steps in this job' })).toBeVisible();
  expect(fetchMock).not.toHaveBeenCalled();

  await userEvent.click(screen.getByRole('button', { name: 'Full job log' }));
  expect(await screen.findByLabelText('Full logs for Build application')).toHaveTextContent(
    'Complete job output',
  );
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(String(fetchMock.mock.calls[0][0])).toBe(
    '/api/activity/job-logs?repository=example%2Fapp&job_id=900',
  );
});

it('loads only the selected Step and shows recently left Steps from cache', async () => {
  serveStepOutput();
  const mounted = render(view());
  expect(fetchMock).not.toHaveBeenCalled();
  mounted.rerender(view(2));
  expect(await screen.findByLabelText('Logs for Compile')).toHaveTextContent('Output for step 2');
  expect(screen.queryByRole('button', { name: /(?:Open|Hide) step log/ })).not.toBeInTheDocument();
  mounted.rerender(view(8));
  expect(await screen.findByLabelText('Logs for Test')).toHaveTextContent('Output for step 8');
  expect(screen.queryByLabelText('Logs for Compile')).not.toBeInTheDocument();
  mounted.rerender(view(2));
  expect(await screen.findByLabelText('Logs for Compile')).toHaveTextContent('Output for step 2');
  mounted.rerender(view(9));
  await screen.findByText('Output for step 9');
  mounted.rerender(view(8));
  await screen.findByText('Output for step 8');
  mounted.rerender(view());
  expect(screen.queryByRole('region', { name: 'Output for Test' })).not.toBeInTheDocument();
  expect(fetchMock.mock.calls.map(([url]) => stepOf(url))).toEqual(['2', '8', '9']);
});

it.each<[JobLogs['state'], string]>([
  ['pending', 'Waiting for GitHub to publish this log…'],
  ['unavailable', 'This job log has expired.'],
])('shows %s log output immediately for the selected Step', async (state, shown) => {
  fetchMock.mockResolvedValue(logs('', { state, message: 'This job log has expired.' }));
  render(view(2));
  expect(await screen.findByText(shown)).toBeVisible();
  // A pending log shows its own waiting state instead of GitHub's message.
  expect(!!screen.queryByText('This job log has expired.')).toBe(state === 'unavailable');
  await waitFor(() => expect(refresh()).toBeEnabled());
  expect(refresh()).toHaveTextContent('Refresh log');
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it('shows a failed selected-Step log request and allows retrying it', async () => {
  fetchMock
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'GitHub is unavailable.' }), { status: 503 }),
    )
    .mockResolvedValueOnce(logs('Recovered output'));
  render(view(2));
  expect(await screen.findByRole('alert')).toHaveTextContent('GitHub is unavailable.');
  await waitFor(() => expect(refresh()).toBeEnabled());
  await userEvent.click(refresh());
  expect(await screen.findByLabelText('Logs for Compile')).toHaveTextContent('Recovered output');
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

const failedJob: Job = {
  ...job,
  conclusion: 'failure',
  steps: [
    { number: 2, name: 'Compile', status: 'completed', conclusion: 'success' },
    { number: 8, name: 'Test', status: 'completed', conclusion: 'failure' },
    { number: 9, name: 'Publish', status: 'completed', conclusion: 'skipped' },
  ],
};

it.each([
  ['a successful Job', job, '3 of 3 steps completed'],
  ['a cancelled Job', { ...job, conclusion: 'cancelled' }, '3 of 3 steps completed'],
])('summarizes %s by its completed steps', (_case, shown, outcome) => {
  render(view(undefined, shown));
  expect(screen.getByText('3/3 steps completed')).toBeVisible();
  expect(screen.getByRole('progressbar', { name: outcome })).toBeVisible();
  expect(screen.queryByRole('button', { name: /Failed at step/ })).not.toBeInTheDocument();
});

it('names the first failed step, measures progress to it, and opens it', async () => {
  const onSelectStep = vi.fn();
  render(view(undefined, failedJob, onSelectStep));
  expect(screen.queryByText('3/3 steps completed')).not.toBeInTheDocument();
  const bar = screen.getByRole('progressbar', { name: 'Failed at step 8 of 9' });
  expect(bar).toHaveAttribute('aria-valuenow', '8');
  expect(bar).toHaveAttribute('aria-valuemax', '9');
  await userEvent.click(screen.getByRole('button', { name: 'Failed at step 8 · Test' }));
  expect(onSelectStep).toHaveBeenCalledExactlyOnceWith(8);
});

it('notes step numbers that GitHub did not report', () => {
  render(view());
  const table = screen.getByRole('table', { name: 'Steps in this job' });
  expect(within(table).getByText('1 step not reported by GitHub')).toBeVisible();
  expect(within(table).getByText('5 steps not reported by GitHub')).toBeVisible();
  expect(within(table).getAllByText(/not reported by GitHub/)).toHaveLength(2);
});

it('says the log is being fetched and counts elapsed seconds once it runs long', async () => {
  fetchMock.mockReturnValue(new Promise<Response>(() => {}));
  vi.useFakeTimers({ shouldAdvanceTime: true });
  try {
    render(view(2));
    await screen.findByRole('status', { name: 'Fetching log from GitHub…' });
    expect(screen.getByText('Fetching log from GitHub…')).toBeVisible();
    act(() => vi.advanceTimersByTime(12_000));
    expect(screen.getByText(/^Still fetching from GitHub… \(1[23]s\)$/)).toBeVisible();
    // The announced label stays fixed so screen readers are not told every second.
    expect(screen.getByRole('status', { name: 'Fetching log from GitHub…' })).toBeInTheDocument();
  } finally {
    vi.useRealTimers();
  }
});

it('pins error annotations above the output and scrolls to them', async () => {
  const content = [
    'Setting up',
    '2026-09-30T01:00:00.000Z ##[error]First failure',
    'more output',
    '##[error]Second failure',
    '##[error]Third failure',
    '##[error]Fourth failure',
  ].join('\n');
  const scrolled: number[] = [];
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const top = Number(this.getAttribute('data-line') ?? 0) * 20;
    return { top } as DOMRect;
  });
  vi.spyOn(Element.prototype, 'scrollTop', 'set').mockImplementation((value: number) => {
    scrolled.push(value);
  });
  // The output scrolls itself, as in the desktop layout.
  vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockReturnValue(1000);
  const scrollIntoView = vi.spyOn(Element.prototype, 'scrollIntoView');
  fetchMock.mockResolvedValue(logs(content));
  const mounted = render(view(2));
  await screen.findByLabelText('Logs for Compile');
  const summary = screen.getByRole('region', { name: 'Errors in this log' });
  const buttons = within(summary).getAllByRole('button');
  expect(buttons).toHaveLength(3);
  expect(buttons[0]).toHaveAccessibleName('Go to line 2: First failure');
  expect(within(summary).getByText('1 more error in the output')).toBeVisible();
  await waitFor(() => expect(scrolled).toEqual([40]));

  await userEvent.click(within(summary).getByRole('button', { name: /line 4/ }));
  expect(scrolled).toEqual([40, 80]);

  await userEvent.click(refresh());
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  expect(scrolled).toEqual([40, 80]);
  expect(scrollIntoView).not.toHaveBeenCalled();
  mounted.unmount();
});

it('scrolls the page to pinned errors when the output grows with its content', async () => {
  const content = ['Setting up', '##[error]First failure', 'more', '##[error]Second failure'].join(
    '\n',
  );
  const scrolled: number[] = [];
  vi.spyOn(Element.prototype, 'scrollTop', 'set').mockImplementation((value: number) => {
    scrolled.push(value);
  });
  // At phone width the output is as tall as its content, so only an ancestor scrolls.
  vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockReturnValue(400);
  vi.spyOn(Element.prototype, 'clientHeight', 'get').mockReturnValue(400);
  const centred: string[] = [];
  vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(function (
    this: Element,
    options?: boolean | ScrollIntoViewOptions,
  ) {
    expect(options).toEqual({ block: 'center' });
    centred.push(this.getAttribute('data-line') ?? '');
  });
  fetchMock.mockResolvedValue(logs(content));
  render(view(2));
  const summary = await screen.findByRole('region', { name: 'Errors in this log' });
  await waitFor(() => expect(centred).toEqual(['2']));
  await userEvent.click(within(summary).getByRole('button', { name: /line 4/ }));
  expect(centred).toEqual(['2', '4']);
  expect(scrolled).toEqual([]);
});

it('does not show an error summary for clean logs', async () => {
  fetchMock.mockResolvedValue(logs('All good\nfailed tests: 0'));
  render(view(2));
  await screen.findByLabelText('Logs for Compile');
  expect(screen.queryByRole('region', { name: 'Errors in this log' })).not.toBeInTheDocument();
});

it('titles the Job header with the Job name alone', () => {
  render(view());
  const heading = screen.getByRole('heading', { name: 'Build application' });
  // Headings stand alone; no small "Job" label sits beside them.
  expect(heading.parentElement).toHaveTextContent(/^Build application$/);
  expect(screen.queryByText('Job', { exact: true })).not.toBeInTheDocument();
});
