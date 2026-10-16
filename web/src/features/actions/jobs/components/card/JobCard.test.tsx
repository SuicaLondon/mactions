import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { createQueryClient } from '../../../../../shared/api/query-client';
import type { JobLogs } from '../../../../../shared/api/types';
import { makeJob } from '../../../../../test/activity-fixtures';
import { JobCard } from './JobCard';

const job = makeJob({
  id: 900,
  name: 'Build application',
  actor: 'octocat',
  head_sha: 'abcdef1234567890',
  started_at: '2026-09-30T01:00:00Z',
  completed_at: '2026-09-30T01:01:30Z',
  steps: [
    { number: 1, name: 'Set up job', status: 'completed', conclusion: 'success' },
    {
      number: 16,
      name: 'Build',
      status: 'completed',
      conclusion: 'success',
      started_at: '2026-09-30T01:00:10Z',
      completed_at: '2026-09-30T01:01:20Z',
    },
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
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function mount(value = job) {
  return render(
    <QueryClientProvider client={client}>
      <JobCard job={value} runnerId={1} repository="example/app" />
    </QueryClientProvider>,
  );
}
function logs(fields: Partial<JobLogs>) {
  return new Response(
    JSON.stringify({ state: 'available', content: '', message: '', steps: [], ...fields }),
  );
}
function response(content: string) {
  return logs({ content });
}

it('loads only an opened step, preserving sparse step numbers and full text safely', async () => {
  const visibleContent = `<script>alert('log text')</script>\n${'Build output\n'.repeat(6000)}LAST LINE`;
  const content = `\u001b[32m^[[36;1m${visibleContent}^[[0m\u001b[0m`;
  fetchMock.mockResolvedValue(response(content));
  mount();
  expect(fetchMock).not.toHaveBeenCalled();
  expect(screen.getByText('@octocat')).toBeVisible();
  expect(screen.getByText('abcdef1')).toHaveAttribute('title', job.head_sha);
  expect(screen.getByText('1m 30s')).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: /^Build, Success/ }));
  const output = await screen.findByLabelText('Logs for Build');
  expect(output.textContent).toBe(visibleContent);
  expect(output.querySelector('script')).toBeNull();
  expect(String(fetchMock.mock.calls[0][0])).toBe(
    '/api/runners/1/job-logs?repository=example%2Fapp&job_id=900&step_number=16',
  );
  expect(fetchMock).toHaveBeenCalledTimes(1);
  await userEvent.click(screen.getByRole('checkbox', { name: 'Wrap lines' }));
  expect(output).toHaveAttribute('data-wrapped');
  await userEvent.click(screen.getByRole('button', { name: /^Build, Success/ }));
  expect(screen.queryByLabelText('Logs for Build')).not.toBeInTheDocument();
});

it('loads the whole job independently and exposes retry for unavailable step logs', async () => {
  fetchMock.mockImplementation(async (url) => {
    if (String(url).includes('step_number')) {
      return logs({
        state: 'unavailable',
        message: 'Step logs have expired. Open the full job log.',
      });
    }
    return response('Complete job output');
  });
  mount();
  await userEvent.click(screen.getByRole('button', { name: /^Build, Success/ }));
  expect(await screen.findByText('Step logs have expired. Open the full job log.')).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: 'Full job log' }));
  expect(await screen.findByLabelText('Full logs for Build application')).toHaveTextContent(
    'Complete job output',
  );
  await userEvent.click(
    within(screen.getByRole('region', { name: 'Output for Build' })).getByRole('button', {
      name: 'Refresh logs for build',
    }),
  );
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
});

function stubDownload() {
  const createObjectURL = vi.fn<typeof URL.createObjectURL>().mockReturnValue('blob:job-output');
  const revokeObjectURL = vi.fn<typeof URL.revokeObjectURL>();
  vi.stubGlobal(
    'URL',
    class extends URL {
      static createObjectURL = createObjectURL;
      static revokeObjectURL = revokeObjectURL;
    },
  );
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  return { createObjectURL, revokeObjectURL, downloaded: () => click.mock.contexts[0] };
}

it('downloads the raw step output and releases its object URL', async () => {
  const content = '\u001b[32mRaw build output\u001b[0m\n';
  fetchMock.mockResolvedValue(logs({ scope: 'step', content }));
  const { createObjectURL, revokeObjectURL, downloaded } = stubDownload();
  mount();
  await userEvent.click(screen.getByRole('button', { name: /^Build, Success/ }));
  const download = await screen.findByRole('button', { name: 'Download' });
  vi.useFakeTimers();
  fireEvent.click(download);
  expect(createObjectURL).toHaveBeenCalledWith(
    expect.objectContaining({ size: content.length, type: 'text/plain;charset=utf-8' }),
  );
  expect(downloaded()).toHaveAttribute('download', 'job-900-step-16.log');
  expect(downloaded()).toHaveAttribute('href', 'blob:job-output');
  await act(() => vi.advanceTimersByTimeAsync(1000));
  expect(revokeObjectURL).toHaveBeenCalledWith('blob:job-output');
});

it('labels a whole-job fallback for a step honestly and downloads it as the job log', async () => {
  const message = 'GitHub did not publish a separate log for this step.';
  fetchMock.mockResolvedValue(logs({ scope: 'job', message, content: 'Complete job output' }));
  const { downloaded } = stubDownload();
  mount();
  await userEvent.click(screen.getByRole('button', { name: /^Build, Success/ }));
  const step = within(screen.getByRole('region', { name: 'Output for Build' }));
  expect(await step.findByLabelText('Full logs for Build application')).toHaveTextContent(
    'Complete job output',
  );
  expect(step.getByText('Full job log')).toBeVisible();
  expect(step.getByText(message)).toBeVisible();
  expect(step.queryByLabelText('Logs for Build')).not.toBeInTheDocument();
  await userEvent.click(step.getByRole('button', { name: 'Download' }));
  expect(downloaded()).toHaveAttribute('download', 'job-900.log');
});

it('does not preload running or failed steps, nor request a step that has not started', async () => {
  mount({
    ...job,
    status: 'in_progress',
    conclusion: null,
    steps: [
      { ...job.steps[0], status: 'queued', conclusion: null },
      { ...job.steps[1], name: 'Lint', status: 'in_progress', conclusion: null },
      { ...job.steps[1], number: 17, conclusion: 'failure' },
    ],
  });
  for (const name of [/^Lint, Running/, /^Build, Failure/]) {
    expect(screen.getByRole('button', { name })).toHaveAttribute('aria-expanded', 'false');
  }
  await userEvent.click(screen.getByRole('button', { name: /Set up job/ }));
  expect(screen.getByText('This step has not started yet.')).toBeVisible();
  expect(fetchMock).not.toHaveBeenCalled();
});

it('pauses pending log polling while hidden and drops the observer on collapsing output', async () => {
  vi.useFakeTimers();
  let hidden = false;
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => {
    if (hidden) return 'hidden';
    return 'visible';
  });
  fetchMock.mockImplementation(async () => logs({ state: 'pending', message: 'Still running.' }));
  render(
    <QueryClientProvider client={client}>
      <JobCard job={job} repository="example/app" />
    </QueryClientProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Full job log' }));
  const tick = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));
  const setHidden = (value: boolean) =>
    act(() => {
      hidden = value;
      document.dispatchEvent(new Event('visibilitychange'));
    });
  await tick(20);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(String(fetchMock.mock.calls[0][0])).toBe(
    '/api/activity/job-logs?repository=example%2Fapp&job_id=900',
  );
  await tick(15_020);
  expect(fetchMock).toHaveBeenCalledTimes(2);
  setHidden(true);
  await tick(60_000);
  expect(fetchMock).toHaveBeenCalledTimes(2);
  setHidden(false);
  await tick(15_020);
  expect(fetchMock.mock.calls.length).toBeGreaterThan(2);
  fireEvent.click(screen.getByRole('button', { name: 'Hide full log' }));
  const count = fetchMock.mock.calls.length;
  await tick(60_000);
  expect(fetchMock).toHaveBeenCalledTimes(count);
});

it('keeps the last available output readable when a manual refresh fails', async () => {
  fetchMock.mockResolvedValueOnce(response('Completed build output')).mockResolvedValueOnce(
    new Response(JSON.stringify({ error: 'GitHub is temporarily unavailable.' }), {
      status: 503,
    }),
  );
  mount();
  await userEvent.click(screen.getByRole('button', { name: 'Full job log' }));
  expect(await screen.findByLabelText('Full logs for Build application')).toHaveTextContent(
    'Completed build output',
  );
  await userEvent.click(
    screen.getByRole('button', { name: 'Refresh full logs for build application' }),
  );
  const failure = (await screen.findByText('Update failed')).closest('[role="status"]');
  expect(failure).toHaveAttribute('title', 'GitHub is temporarily unavailable.');
  expect(failure).toHaveTextContent('GitHub is temporarily unavailable.');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Full logs for Build application')).toHaveTextContent(
    'Completed build output',
  );
});

it('preserves ANSI colors and resets while keeping log content as safe text', async () => {
  const html = '<img src=x onerror=alert(1)>';
  fetchMock.mockResolvedValue(
    response(
      `\u001b[32mBuild passed\u001b[0m\n\u001b[1;31m${html}\u001b[22;39m plain\n\u001b[38;2;121;192;255mRGB color\u001b[0m\n\u001b[38;5;196mIndexed color\u001b[0m`,
    ),
  );
  mount();
  expect(fetchMock).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole('button', { name: 'Full job log' }));
  const output = await screen.findByLabelText('Full logs for Build application');
  expect(output.textContent).toBe(`Build passed\n${html} plain\nRGB color\nIndexed color`);
  expect(within(output).getByText('Build passed')).toHaveClass('text-green-300');
  expect(within(output).getByText(html)).toHaveClass('text-red-400', 'font-bold');
  expect(within(output).getByText('RGB color')).toHaveStyle({ color: 'rgb(121, 192, 255)' });
  expect(within(output).getByText('Indexed color')).toHaveStyle({ color: 'rgb(255, 0, 0)' });
  expect(output.querySelector('img')).toBeNull();
  expect(output.querySelectorAll('[data-line]')).toHaveLength(4);
});

it('marks explicit GitHub annotations without guessing severity from ordinary log words', async () => {
  const content =
    '2026-09-30T01:00:00.000Z ##[error]Build failed\n::warning file=build.ts,line=4::Unused value\n::group::Build application\nfailed tests: 0\nAll error cases passed\n';
  fetchMock.mockResolvedValue(response(content));
  mount();
  await userEvent.click(screen.getByRole('button', { name: 'Full job log' }));
  const output = await screen.findByLabelText('Full logs for Build application');
  const annotations = [...output.querySelectorAll('[data-line]')].map((line) =>
    line.getAttribute('data-annotation'),
  );
  expect(annotations.slice(0, 5)).toEqual(['error', 'warning', 'group', null, null]);
});
