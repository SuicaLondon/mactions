import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { JobCard } from './JobCard';
import { createQueryClient } from './use-runners';
import type { Job } from './types';

const job: Job = {
  id: 900, name: 'Build application', workflow: 'CI', status: 'completed', conclusion: 'success',
  branch: 'main', run_number: 42, run_id: 100, run_attempt: 2, url: 'https://github.com/example/app/actions/runs/100/job/900',
  run_url: 'https://github.com/example/app/actions/runs/100', event: 'push', actor: 'octocat', head_sha: 'abcdef1234567890',
  commit_message: 'Improve runner output', runner_name: 'mac-build-1', runner_group_name: 'Default', labels: ['self-hosted', 'macOS'],
  started_at: '2026-09-30T01:00:00Z', completed_at: '2026-09-30T01:01:30Z',
  steps: [
    { number: 1, name: 'Set up job', status: 'completed', conclusion: 'success' },
    { number: 16, name: 'Build', status: 'completed', conclusion: 'success', started_at: '2026-09-30T01:00:10Z', completed_at: '2026-09-30T01:01:20Z' },
  ],
};
const fetchMock = vi.fn<typeof fetch>();
let client: ReturnType<typeof createQueryClient>;
beforeEach(() => { client = createQueryClient(); fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); });
afterEach(() => { client.clear(); vi.unstubAllGlobals(); });
function mount(value = job) { return render(<QueryClientProvider client={client}><JobCard job={value} runnerId={1} repository="example/app"/></QueryClientProvider>); }
function response(content: string) { return new Response(JSON.stringify({ state: 'available', content, message: '', steps: [] }), { headers: { 'Content-Type': 'application/json' } }); }

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
  expect(String(fetchMock.mock.calls[0][0])).toBe('/api/runners/1/job-logs?repository=example%2Fapp&job_id=900&step_number=16');
  expect(fetchMock).toHaveBeenCalledTimes(1);
  await userEvent.click(screen.getByRole('checkbox', { name: 'Wrap lines' }));
  expect(output).toHaveClass('wrap-lines');
  await userEvent.click(screen.getByRole('button', { name: /^Build, Success/ }));
  expect(screen.queryByLabelText('Logs for Build')).not.toBeInTheDocument();
});

it('loads the whole job independently and exposes retry for unavailable step logs', async () => {
  fetchMock.mockImplementation(async url => String(url).includes('step_number') ? new Response(JSON.stringify({ state: 'unavailable', message: 'Step logs have expired. Open the full job log.', content: '', steps: [] })) : response('Complete job output'));
  mount();
  await userEvent.click(screen.getByRole('button', { name: /^Build, Success/ }));
  expect(await screen.findByText('Step logs have expired. Open the full job log.')).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: 'Full job log' }));
  expect(await screen.findByLabelText('Full logs for Build application')).toHaveTextContent('Complete job output');
  await userEvent.click(within(screen.getByRole('region', { name: 'Output for Build' })).getByRole('button', { name: 'Refresh logs for build' }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
});

it('labels a whole-job fallback honestly when separate step output is unavailable', async () => {
  const message = 'GitHub did not publish a separate log for this step. Showing the complete job log.';
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ state: 'available', scope: 'job', message, content: 'Complete job output', steps: [] })));
  mount();
  await userEvent.click(screen.getByRole('button', { name: /^Build, Success/ }));
  const step = within(screen.getByRole('region', { name: 'Output for Build' }));
  expect(await step.findByLabelText('Full logs for Build application')).toHaveTextContent('Complete job output');
  expect(step.getByText('Full job output')).toBeVisible();
  expect(step.getByText(message)).toBeVisible();
  expect(step.queryByText('Step output')).not.toBeInTheDocument();
  expect(step.queryByLabelText('Logs for Build')).not.toBeInTheDocument();
});

it('does not request output for a step that has not started', async () => {
  mount({ ...job, status: 'in_progress', conclusion: null, steps: [{ ...job.steps[0], status: 'queued', conclusion: null }] });
  await userEvent.click(screen.getByRole('button', { name: /Set up job/ }));
  expect(screen.getByText('This step has not started yet.')).toBeVisible();
  expect(fetchMock).not.toHaveBeenCalled();
});
