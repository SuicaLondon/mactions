import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { createQueryClient } from '../../shared/api/query-client';
import type { Job } from '../../shared/api/types';
import type { JobSummary, WorkflowRun } from './data/types/activity-types';
import { JobHistory } from './history/components/list/JobHistory';
import { RunDetail } from './runs/components/detail/RunDetail';
import { RunsView } from './runs/components/list/RunsView';

const run: WorkflowRun = {
  id: 100,
  repository: 'example/app',
  workflow_id: 8,
  name: 'CI',
  title: 'Improve build',
  number: 42,
  attempt: 1,
  status: 'in_progress',
  conclusion: null,
  branch: 'main',
  head_sha: 'abcdef1',
  url: 'https://github.com/example/app/actions/runs/100',
  created_at: '2026-09-30T01:00:00Z',
  started_at: '2026-09-30T01:00:00Z',
  updated_at: null,
};
const local: JobSummary = {
  id: 900,
  name: 'Build application',
  workflow: 'CI',
  status: 'in_progress',
  conclusion: null,
  repository: run.repository,
  workflow_id: 8,
  branch: 'main',
  run_number: 42,
  run_id: 100,
  run_attempt: 1,
  url: `${run.url}/job/900`,
  run_url: run.url,
  runner_id: 11,
  runner_name: 'my-mac',
  host_type: 'self-hosted',
  device: 'this_device',
  started_at: '2026-09-30T01:00:00Z',
  completed_at: null,
};
const remote: JobSummary = {
  ...local,
  id: 901,
  name: 'Test',
  runner_id: 12,
  runner_name: 'linux-remote',
  device: 'other_device',
};
const hosted: JobSummary = {
  ...remote,
  id: 902,
  name: 'Lint',
  runner_id: 13,
  runner_name: 'GitHub runner',
  host_type: 'github-hosted',
};
const fullJob: Job = {
  ...local,
  steps: [
    {
      number: 1,
      name: 'Compile',
      status: 'in_progress',
      conclusion: null,
      started_at: local.started_at,
    },
  ],
};
const historic: JobSummary = {
  ...local,
  id: 899,
  run_number: 41,
  run_id: 99,
  status: 'completed',
  conclusion: 'success',
  started_at: '2026-09-30T01:00:00Z',
  completed_at: '2026-09-30T01:01:30Z',
};
const fetchMock = vi.fn<typeof fetch>();
let client: ReturnType<typeof createQueryClient>;
let hidden = false;

beforeEach(() => {
  client = createQueryClient();
  hidden = false;
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => {
    if (hidden) {
      return 'hidden';
    }
    return 'visible';
  });
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  client.clear();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function json(value: unknown) {
  return new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });
}
function requests(resource: string) {
  return fetchMock.mock.calls.filter(
    ([url]) => String(url).split('?')[0] === `/api/activity/${resource}`,
  );
}
function mount(element: React.ReactNode) {
  return render(<QueryClientProvider client={client}>{element}</QueryClientProvider>);
}

function mockActivityFetch(handler: typeof fetch) {
  fetchMock.mockImplementation((url, options) => {
    if (String(url).startsWith('/api/activity/run-graph?')) {
      return Promise.resolve(
        json({
          state: 'complete',
          message: '',
          nodes: [
            {
              id: 'build',
              name: local.name,
              needs: [],
              job_ids: [local.id],
              matrix: false,
              reusable: false,
            },
          ],
          unmapped_job_ids: [],
          source: null,
        }),
      );
    }
    return handler(url, options);
  });
}

it('shows every runner assignment in a run and loads steps and logs only when opened', async () => {
  mockActivityFetch(async (url) => {
    if (String(url).startsWith('/api/activity/run?'))
      return json({ run, jobs: [local, remote, hosted] });
    if (String(url).startsWith('/api/activity/job?')) return json(fullJob);
    return json({
      state: 'pending',
      content: '',
      steps: [],
      message: 'Logs will be available after completion.',
    });
  });
  const history = vi.fn();
  mount(<RunDetail run={run} highlightRunnerId={11} onOpenHistory={history} />);
  const jobs = within(await screen.findByRole('complementary', { name: 'Jobs in this run' }));
  expect(jobs.getByRole('treeitem', { name: /Build application/ }).closest('li')).toHaveClass(
    'assigned-to-selected-runner',
  );
  expect(jobs.getByRole('treeitem', { name: /Test/ }).closest('li')).not.toHaveClass(
    'assigned-to-selected-runner',
  );
  expect(
    jobs.getByRole('treeitem', {
      name: /Test, Running, linux-remote · Self-hosted · Other device/,
    }),
  ).toBeVisible();
  expect(
    jobs.getByRole('treeitem', {
      name: /Lint, Running, GitHub runner · GitHub-hosted · Other device/,
    }),
  ).toBeVisible();
  expect(requests('job')).toHaveLength(0);
  expect(requests('job-logs')).toHaveLength(0);
  await userEvent.click(jobs.getByRole('treeitem', { name: /Build application/ }));
  const step = await screen.findByRole('button', { name: /^Compile, Running/ });
  expect(requests('job')).toHaveLength(1);
  expect(requests('job-logs')).toHaveLength(0);
  await userEvent.click(screen.getByRole('button', { name: 'Job history' }));
  expect(history).toHaveBeenCalledWith(fullJob);
  await userEvent.click(step);
  expect(screen.getByRole('region', { name: 'Step 1: Compile' })).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Open step log' })).not.toBeInTheDocument();
  expect(await screen.findByRole('status', { name: 'Loading log output…' })).toHaveTextContent('');
  expect(screen.queryByText('Logs will be available after completion.')).not.toBeInTheDocument();
  expect(requests('job-logs')).toHaveLength(1);
  const logUrl = String(requests('job-logs')[0][0]);
  expect(logUrl).toContain('job_id=900');
  expect(logUrl).toContain('step_number=1');
});

it('restores a previously selected job when returning from history', async () => {
  mockActivityFetch(async (url) => {
    if (String(url).startsWith('/api/activity/run?')) {
      return json({ run, jobs: [local] });
    }
    return json(fullJob);
  });
  mount(<RunDetail run={run} initialJobId={900} onOpenHistory={vi.fn()} />);
  expect(await screen.findByRole('button', { name: /^Compile, Running/ })).toBeVisible();
  expect(requests('job')).toHaveLength(1);
  expect(requests('job-logs')).toHaveLength(0);
});

it('compares historical job durations and loads step durations only after expanding an item', async () => {
  mockActivityFetch(async (url) => {
    if (String(url).startsWith('/api/activity/job-history?')) {
      return json({
        jobs: [historic, { ...historic, id: 898, run_number: 40, conclusion: 'failure' }],
        next_page: null,
        message: '',
      });
    }
    return json({
      ...historic,
      steps: [
        {
          number: 1,
          name: 'Compile',
          status: 'completed',
          conclusion: 'success',
          started_at: historic.started_at,
          completed_at: '2026-09-30T01:01:10Z',
        },
      ],
    });
  });
  mount(<JobHistory job={fullJob} repository={run.repository} />);
  const item = await screen.findByRole('button', {
    name: 'Expand Build application run #41 attempt 1',
  });
  expect(screen.getAllByText('1m 30s')).toHaveLength(2);
  expect(
    within(
      screen
        .getByRole('button', { name: 'Expand Build application run #40 attempt 1' })
        .closest('tr')!,
    ).getByText('Failure'),
  ).toBeVisible();
  expect(requests('job')).toHaveLength(0);
  expect(requests('job-logs')).toHaveLength(0);
  await userEvent.click(item);
  const region = within(screen.getByRole('region', { name: 'Steps for run #41' }));
  expect(await region.findByRole('row', { name: 'Compile Success 1m 10s' })).toBeVisible();
  expect(requests('job')).toHaveLength(1);
  expect(requests('job-logs')).toHaveLength(0);
  await userEvent.click(item);
  expect(screen.queryByRole('region', { name: 'Steps for run #41' })).not.toBeInTheDocument();
});

it('paginates runs without requesting jobs and opens the chosen run', async () => {
  const second = {
    ...run,
    id: 101,
    number: 43,
    title: 'Fix tests',
    status: 'completed',
    conclusion: 'failure',
  };
  mockActivityFetch(async (url) => {
    if (new URL(String(url), 'http://localhost').searchParams.get('page') === '2') {
      return json({ runs: [second], next_page: null, message: '' });
    }
    return json({ runs: [run], next_page: 2, message: '' });
  });
  const open = vi.fn();
  mount(
    <RunsView
      scope={{ organization: 'example', repository: 'example/app' }}
      runnerId={11}
      runnerName="my-mac"
      onOpenRun={open}
    />,
  );
  const initial = await screen.findByRole('button', { name: 'Open CI run #42 in example/app' });
  expect(String(fetchMock.mock.calls[0][0])).toContain('runner_id=11');
  expect(requests('job')).toHaveLength(0);
  await userEvent.click(initial);
  expect(open).toHaveBeenCalledWith(run);
  await userEvent.click(screen.getByRole('button', { name: 'Load more runs' }));
  expect(await screen.findByText('Fix tests')).toBeVisible();
  expect(requests('runs')).toHaveLength(2);
  expect(screen.queryByRole('button', { name: 'Load more runs' })).not.toBeInTheDocument();
});

it('identifies GitHub Actions runs by title, workflow, attempt, commit and explicit result', async () => {
  const failed = {
    ...run,
    attempt: 2,
    status: 'completed',
    conclusion: 'failure',
    updated_at: '2026-09-30T01:01:30Z',
  };
  fetchMock.mockResolvedValue(json({ runs: [failed], next_page: null, message: '' }));
  mount(
    <RunsView scope={{ organization: 'example', repository: 'example/app' }} onOpenRun={vi.fn()} />,
  );
  const item = within(
    (await screen.findByRole('button', { name: 'Open CI run #42 in example/app' })).closest('tr')!,
  );
  expect(screen.getByText('GitHub Actions')).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Workflow runs' })).toBeVisible();
  expect(screen.getByText('1 run loaded')).toBeVisible();
  expect(item.getByText('Improve build')).toBeVisible();
  expect(item.getByText('CI')).toBeVisible();
  expect(item.getByText('#42 · attempt 2')).toBeVisible();
  expect(item.getByText('abcdef1')).toHaveAttribute('title', 'abcdef1');
  expect(item.getByText('Failure')).toBeVisible();
  expect(item.getByText('1m 30s')).toBeVisible();
  expect(screen.getByRole('link', { name: 'View run #42 on GitHub' })).toHaveAttribute(
    'href',
    run.url,
  );
  expect(requests('job')).toHaveLength(0);
});

it('does not repeat the workflow name when it is also the run title', async () => {
  fetchMock.mockResolvedValue(
    json({ runs: [{ ...run, title: 'CI' }], next_page: null, message: '' }),
  );
  mount(
    <RunsView scope={{ organization: 'example', repository: 'example/app' }} onOpenRun={vi.fn()} />,
  );
  const item = within(
    (await screen.findByRole('button', { name: 'Open CI run #42 in example/app' })).closest('tr')!,
  );
  expect(item.getAllByText('CI')).toHaveLength(1);
  expect(item.getByText('#42')).toBeVisible();
  expect(item.getByText('Running')).toBeVisible();
});

it('pauses detail polling while hidden and stops it when the detail view unmounts', async () => {
  vi.useFakeTimers();
  mockActivityFetch(async () => json({ run, jobs: [local] }));
  const view = mount(<RunDetail run={run} onOpenHistory={vi.fn()} />);
  async function tick(ms: number) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ms);
    });
  }
  await tick(20);
  expect(requests('run')).toHaveLength(1);
  await tick(15_020);
  expect(requests('run')).toHaveLength(2);
  act(() => {
    hidden = true;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await tick(60_000);
  expect(requests('run')).toHaveLength(2);
  act(() => {
    hidden = false;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await tick(20);
  expect(requests('run')).toHaveLength(3);
  view.unmount();
  await tick(60_000);
  expect(requests('run')).toHaveLength(3);
});

it('aborts an in-flight job read on hiding the page', async () => {
  let signal: AbortSignal | null | undefined;
  mockActivityFetch(async (url, options) => {
    if (String(url).startsWith('/api/activity/run?')) return json({ run, jobs: [local] });
    signal = options?.signal;
    return new Promise<Response>((_resolve, reject) =>
      signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))),
    );
  });
  mount(<RunDetail run={run} onOpenHistory={vi.fn()} />);
  fireEvent.click(await screen.findByRole('treeitem', { name: /Build application/ }));
  await waitFor(() => expect(signal).toBeDefined());
  act(() => {
    hidden = true;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(signal?.aborted).toBe(true);
});

it('keeps literal job names and supports expanding and navigating the job-step tree by keyboard', async () => {
  const nestedName = { ...local, name: 'Build / Test' };
  mockActivityFetch(async (url) => {
    if (String(url).startsWith('/api/activity/run?')) {
      return json({ run, jobs: [nestedName, remote] });
    }
    return json({ ...fullJob, name: nestedName.name });
  });
  const selection = vi.fn();
  mount(<RunDetail run={run} onOpenHistory={vi.fn()} onSelectionChange={selection} />);
  const tree = within(await screen.findByRole('tree', { name: 'Run jobs and steps' }));
  const job = tree.getByRole('treeitem', { name: /^Build \/ Test,/ });
  expect(job).toHaveAttribute('aria-level', '1');
  expect(job).toHaveAttribute('aria-expanded', 'false');
  expect(requests('job')).toHaveLength(0);
  job.focus();
  await userEvent.keyboard('{ArrowRight}');
  const step = await tree.findByRole('treeitem', { name: 'Compile, Running' });
  expect(job).toHaveAttribute('aria-expanded', 'true');
  expect(step).toHaveAttribute('aria-level', '2');
  expect(requests('job')).toHaveLength(1);
  await userEvent.keyboard('{ArrowRight}');
  expect(step).toHaveFocus();
  await userEvent.keyboard('{Enter}');
  expect(selection).toHaveBeenLastCalledWith({ jobId: 900, stepNumber: 1 });
  expect(screen.getByRole('region', { name: 'Step 1: Compile' })).toBeVisible();
  await waitFor(() => expect(requests('job-logs')).toHaveLength(1));
  await userEvent.keyboard('{ArrowLeft}');
  expect(job).toHaveFocus();
  await userEvent.keyboard('{ArrowLeft}');
  expect(job).toHaveAttribute('aria-expanded', 'false');
  expect(tree.queryByRole('treeitem', { name: 'Compile, Running' })).not.toBeInTheDocument();
  await userEvent.keyboard('{ArrowDown}');
  expect(tree.getByRole('treeitem', { name: /^Test,/ })).toHaveFocus();
});

it('loads logs for controlled Step selection and allows returning to the Run overview', async () => {
  mockActivityFetch(async (url) => {
    if (String(url).startsWith('/api/activity/run?')) {
      return json({ run, jobs: [local] });
    }
    return json(fullJob);
  });
  const view = mount(
    <RunDetail run={run} selection={{ jobId: 900, stepNumber: 1 }} onOpenHistory={vi.fn()} />,
  );
  expect(await screen.findByRole('region', { name: 'Step 1: Compile' })).toBeVisible();
  await waitFor(() => expect(requests('job-logs')).toHaveLength(1));
  view.rerender(
    <QueryClientProvider client={client}>
      <RunDetail run={run} selection={{ jobId: null }} onOpenHistory={vi.fn()} />
    </QueryClientProvider>,
  );
  expect(await screen.findByRole('heading', { name: 'Pipeline' })).toBeVisible();
  expect(screen.queryByRole('article', { name: 'Build application' })).not.toBeInTheDocument();
});

it('preserves a known runner identity when GitHub does not report its name', async () => {
  const unnamed = { ...local, runner_name: null };
  mockActivityFetch(async (url) => {
    if (String(url).startsWith('/api/activity/run?')) {
      return json({ run, jobs: [unnamed] });
    }
    return json({ ...fullJob, runner_name: null });
  });
  mount(<RunDetail run={run} onOpenHistory={vi.fn()} />);
  const job = await screen.findByRole('treeitem', {
    name: /^Build application, Running, Runner #11 · Self-hosted · This device/,
  });
  await userEvent.click(job);
  const detail = within(await screen.findByRole('article', { name: 'Build application' }));
  expect(detail.getByText('Runner #11')).toBeVisible();
  expect(detail.getByText('Self-hosted · This device')).toBeVisible();
  expect(detail.queryByText('Unassigned')).not.toBeInTheDocument();
});

it('keeps run list loading non-textual until the result arrives', async () => {
  let finish: (response: Response) => void = () => {};
  fetchMock.mockImplementation(
    () =>
      new Promise<Response>((resolve) => {
        finish = resolve;
      }),
  );
  mount(<RunsView scope={{ organization: '', repository: '' }} onOpenRun={vi.fn()} />);
  expect(screen.getByRole('status', { name: 'Loading runs…' })).toHaveTextContent('');
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
  await act(async () => {
    finish(json({ runs: [run], next_page: null, message: '' }));
  });
  expect(await screen.findByRole('table', { name: 'Workflow runs' })).toBeVisible();
  expect(screen.queryByRole('status', { name: 'Loading runs…' })).not.toBeInTheDocument();
});

it('keeps the run shell visible while jobs and dependencies load', async () => {
  let finish: (response: Response) => void = () => {};
  fetchMock.mockImplementation(
    () =>
      new Promise<Response>((resolve) => {
        finish = resolve;
      }),
  );
  mount(<RunDetail run={run} onOpenHistory={vi.fn()} />);
  expect(screen.getByRole('status', { name: 'Loading jobs…' })).toHaveTextContent('');
  expect(screen.getByRole('heading', { name: `${run.name} #${run.number}` })).toBeVisible();
  await act(async () => {
    finish(json({ run, jobs: [local] }));
  });
  expect(await screen.findByRole('complementary', { name: 'Jobs in this run' })).toBeVisible();
  expect(screen.getByRole('status', { name: 'Loading workflow dependencies…' })).toHaveTextContent(
    '',
  );
});

it('keeps history loading non-textual until executions arrive', async () => {
  let finish: (response: Response) => void = () => {};
  fetchMock.mockImplementation(
    () =>
      new Promise<Response>((resolve) => {
        finish = resolve;
      }),
  );
  mount(<JobHistory job={fullJob} repository={run.repository} onOpenRun={vi.fn()} />);
  expect(screen.getByRole('status', { name: 'Loading job history…' })).toHaveTextContent('');
  await act(async () => {
    finish(json({ jobs: [historic], next_page: null, message: '' }));
  });
  expect(await screen.findByRole('table', { name: 'Job execution history' })).toBeVisible();
  expect(screen.queryByRole('status', { name: 'Loading job history…' })).not.toBeInTheDocument();
});

it('keeps historical steps loading until the selected execution responds', async () => {
  let finish: (response: Response) => void = () => {};
  fetchMock.mockImplementation((url) => {
    if (String(url).startsWith('/api/activity/job-history?')) {
      return Promise.resolve(json({ jobs: [historic], next_page: null, message: '' }));
    }
    return new Promise<Response>((resolve) => {
      finish = resolve;
    });
  });
  mount(<JobHistory job={fullJob} repository={run.repository} />);
  await userEvent.click(
    await screen.findByRole('button', { name: 'Expand Build application run #41 attempt 1' }),
  );
  expect(screen.getByRole('status', { name: 'Loading historical steps…' })).toBeVisible();
  expect(screen.queryByText('No steps are available for this job.')).not.toBeInTheDocument();
  await act(async () => {
    finish(json({ ...historic, steps: [] }));
  });
  expect(await screen.findByText('No steps are available for this job.')).toBeVisible();
  expect(
    screen.queryByRole('status', { name: 'Loading historical steps…' }),
  ).not.toBeInTheDocument();
});
