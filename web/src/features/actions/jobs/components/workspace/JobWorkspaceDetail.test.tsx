import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { createQueryClient } from '../../../../../shared/api/query-client';
import type { Job } from '../../../../../shared/api/types';
import { JobWorkspaceDetail } from './JobWorkspaceDetail';

const job: Job = {
  id: 900,
  name: 'Build application',
  workflow: 'CI',
  status: 'completed',
  conclusion: 'success',
  branch: 'main',
  run_number: 42,
  run_id: 100,
  run_attempt: 1,
  url: 'https://github.com/example/app/actions/runs/100/job/900',
  started_at: '2026-10-03T01:00:00Z',
  completed_at: '2026-10-03T01:02:00Z',
  steps: [
    { number: 2, name: 'Compile', status: 'completed', conclusion: 'success' },
    { number: 8, name: 'Test', status: 'completed', conclusion: 'success' },
    { number: 9, name: 'Publish', status: 'completed', conclusion: 'success' },
  ],
};
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

function view(selectedStepNumber?: number) {
  return (
    <QueryClientProvider client={client}>
      <JobWorkspaceDetail
        job={job}
        repository="example/app"
        selectedStepNumber={selectedStepNumber}
        onOpenHistory={vi.fn()}
        onSelectStep={vi.fn()}
      />
    </QueryClientProvider>
  );
}

function logs(content: string) {
  return new Response(JSON.stringify({ state: 'available', content, message: '', steps: [] }));
}

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

it('automatically loads only the selected Step and changes the log query when selection changes', async () => {
  fetchMock.mockImplementation(async (url) => {
    const step = new URL(String(url), 'http://localhost').searchParams.get('step_number');
    return logs(`Output for step ${step}`);
  });
  const mounted = render(view());
  expect(fetchMock).not.toHaveBeenCalled();

  mounted.rerender(view(2));
  expect(await screen.findByLabelText('Logs for Compile')).toHaveTextContent('Output for step 2');
  expect(screen.queryByRole('button', { name: /(?:Open|Hide) step log/ })).not.toBeInTheDocument();

  mounted.rerender(view(8));
  expect(await screen.findByLabelText('Logs for Test')).toHaveTextContent('Output for step 8');
  expect(screen.queryByLabelText('Logs for Compile')).not.toBeInTheDocument();
  expect(
    fetchMock.mock.calls.map(([url]) =>
      new URL(String(url), 'http://localhost').searchParams.get('step_number'),
    ),
  ).toEqual(['2', '8']);

  mounted.rerender(view());
  expect(screen.queryByRole('region', { name: 'Output for Test' })).not.toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it.each([
  ['pending', 'Logs will be available after completion.'],
  ['unavailable', 'This job log has expired.'],
])('shows %s log output immediately for the selected Step', async (state, message) => {
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify({ state, content: '', message, steps: [] })),
  );
  render(view(2));
  if (state === 'pending') {
    expect(await screen.findByRole('status', { name: 'Loading log output…' })).toHaveTextContent(
      '',
    );
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Refresh logs for compile' })).toBeEnabled(),
    );
    expect(screen.queryByText(message)).not.toBeInTheDocument();
  } else {
    expect(await screen.findByText(message)).toBeVisible();
  }
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Refresh logs for compile' })).toBeEnabled();
});

it('shows a failed selected-Step log request and allows retrying it', async () => {
  fetchMock
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'GitHub is unavailable.' }), { status: 503 }),
    )
    .mockResolvedValueOnce(logs('Recovered output'));
  render(view(2));
  expect(await screen.findByRole('alert')).toHaveTextContent('GitHub is unavailable.');
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Refresh logs for compile' })).toBeEnabled(),
  );
  await userEvent.click(screen.getByRole('button', { name: 'Refresh logs for compile' }));
  expect(await screen.findByLabelText('Logs for Compile')).toHaveTextContent('Recovered output');
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
