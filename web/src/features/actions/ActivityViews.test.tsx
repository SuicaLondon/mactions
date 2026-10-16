import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { createQueryClient } from '../../shared/api/query-client';
import type { Job } from '../../shared/api/types';
import { makeJobSummary, makeRun } from '../../test/activity-fixtures';
import type { JobSummary, WorkflowRun } from './data/types/activity-types';
import { JobHistory } from './history/components/JobHistory';
import { RunDetail } from './runs/components/detail/RunDetail';
import { RunsView } from './runs/components/list/RunsView';

const run = makeRun({
  status: 'in_progress',
  conclusion: null,
  created_at: '2026-09-30T01:00:00Z',
  started_at: '2026-09-30T01:00:00Z',
});
const local = makeJobSummary({
  id: 900,
  name: 'Build application',
  status: 'in_progress',
  conclusion: null,
  runner_id: 11,
  runner_name: 'my-mac',
  host_type: 'self-hosted',
  device: 'this_device',
  started_at: '2026-09-30T01:00:00Z',
});
const step = {
  number: 1,
  name: 'Compile',
  status: 'in_progress',
  conclusion: null,
  started_at: local.started_at,
};
const fullJob: Job = { ...local, steps: [step] };
const historic: JobSummary = {
  ...local,
  id: 899,
  run_number: 41,
  run_id: 99,
  status: 'completed',
  conclusion: 'success',
  completed_at: '2026-09-30T01:01:30Z',
};
const scope = { organization: 'example', repository: 'example/app' };
const graph = {
  state: 'complete',
  message: '',
  nodes: [
    { id: 'build', name: local.name, needs: [], job_ids: [900], matrix: false, reusable: false },
  ],
  unmapped_job_ids: [],
  source: null,
};

type Route = (url: URL, init?: RequestInit) => Response | Promise<Response>;

const fetchMock = vi.fn<typeof fetch>();
let client: ReturnType<typeof createQueryClient>;
let hidden = false;

beforeEach(() => {
  client = createQueryClient();
  hidden = false;
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => {
    if (hidden) return 'hidden';
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

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
function failure(message: string) {
  return json({ error: message }, 503);
}
function ok(value: unknown): Route {
  return () => json(value);
}
const never: Route = () => new Promise<Response>(() => {});
/** Answers the second page with `second` and every other page with `first`. */
function byPage(first: () => Response, second: () => Response): Route {
  return (url) => {
    if (url.searchParams.get('page') === '2') return second();
    return first();
  };
}
/** Fails run list reads while `state.failing` is set. */
function flakyRuns(state: { failing: boolean }): Route {
  return () => {
    if (state.failing) return failure('GitHub is temporarily unavailable.');
    return json(runs([run]));
  };
}
function runs(list: WorkflowRun[], nextPage: number | null = null) {
  return { runs: list, next_page: nextPage, message: '' };
}

/** Answers `/api/activity/<resource>` requests; the run graph defaults to one Build node. */
function serve(routes: Record<string, Route>) {
  fetchMock.mockImplementation(async (input, init) => {
    const url = new URL(String(input), 'http://localhost');
    const resource = url.pathname.replace('/api/activity/', '');
    let route = routes[resource];
    if (!route && resource === 'run-graph') route = ok(graph);
    return (route ?? never)(url, init);
  });
}
/** Holds every request open; the returned function answers the latest one. */
function holdRequests() {
  let finish: (response: Response) => void = () => {};
  fetchMock.mockImplementation(() => new Promise<Response>((resolve) => (finish = resolve)));
  return (response: Response) => act(async () => finish(response));
}
function requests(resource: string) {
  return fetchMock.mock.calls.filter(
    ([url]) => String(url).split('?')[0] === `/api/activity/${resource}`,
  );
}
function wrap(element: ReactNode) {
  return <QueryClientProvider client={client}>{element}</QueryClientProvider>;
}
function mount(element: ReactNode) {
  return render(wrap(element));
}
function setHidden(value: boolean) {
  act(() => {
    hidden = value;
    document.dispatchEvent(new Event('visibilitychange'));
  });
}

it('shows every runner assignment in a run and loads steps and logs only when opened', async () => {
  const failed: JobSummary = {
    ...local,
    id: 901,
    name: 'Test',
    status: 'completed',
    conclusion: 'failure',
    runner_id: 12,
    runner_name: 'linux-remote',
    device: 'other_device',
  };
  const hosted: JobSummary = {
    ...local,
    id: 902,
    name: 'Lint',
    runner_name: 'GitHub runner',
    host_type: 'github-hosted',
    device: 'other_device',
  };
  serve({
    run: ok({ run, jobs: [local, failed, hosted] }),
    job: ok(fullJob),
    'job-logs': ok({ state: 'pending', content: '', steps: [], message: 'After completion.' }),
  });
  const history = vi.fn();
  mount(<RunDetail run={run} highlightRunnerId={11} onOpenHistory={history} />);
  const jobs = within(await screen.findByRole('complementary', { name: 'Jobs in this run' }));
  const build = jobs.getByRole('treeitem', { name: /Build application/ });
  expect(build.closest('li')).toHaveAttribute('data-selected-runner');
  expect(jobs.getByRole('treeitem', { name: /Test/ }).closest('li')).not.toHaveAttribute(
    'data-selected-runner',
  );
  expect(
    jobs.getByRole('treeitem', {
      name: /Test, Failure, linux-remote · Self-hosted · Other device/,
    }),
  ).toBeVisible();
  expect(
    jobs.getByRole('treeitem', { name: /Lint, Running, GitHub runner · GitHub-hosted/ }),
  ).toBeVisible();
  expect(requests('job')).toHaveLength(0);

  await userEvent.click(build);
  const stepButton = await screen.findByRole('button', { name: /^Compile, Running/ });
  expect(requests('job')).toHaveLength(1);
  expect(requests('job-logs')).toHaveLength(0);
  await userEvent.click(screen.getByRole('button', { name: 'Job history' }));
  expect(history).toHaveBeenCalledWith(fullJob);

  await userEvent.click(stepButton);
  expect(screen.getByRole('region', { name: 'Step 1: Compile' })).toBeVisible();
  expect(
    await screen.findByRole('status', { name: 'Waiting for GitHub to publish this log…' }),
  ).toBeVisible();
  expect(screen.queryByText('After completion.')).not.toBeInTheDocument();
  expect(String(requests('job-logs')[0][0])).toMatch(/job_id=900.*step_number=1/);
});

it('restores a previously selected job when returning from history', async () => {
  serve({ run: ok({ run, jobs: [local] }), job: ok(fullJob) });
  mount(<RunDetail run={run} initialJobId={900} onOpenHistory={vi.fn()} />);
  expect(await screen.findByRole('button', { name: /^Compile, Running/ })).toBeVisible();
  expect(requests('job-logs')).toHaveLength(0);
});

it('compares historical executions, marks the current one, and loads steps on expand', async () => {
  serve({
    'job-history': ok({
      jobs: [
        { ...historic, id: fullJob.id, run_number: 42 },
        historic,
        { ...historic, id: 898, run_number: 40, conclusion: 'failure' },
      ],
      next_page: null,
      message: '',
    }),
    job: ok({
      ...historic,
      steps: [
        {
          ...step,
          status: 'completed',
          conclusion: 'success',
          completed_at: '2026-09-30T01:01:10Z',
        },
      ],
    }),
  });
  mount(<JobHistory job={fullJob} repository={run.repository} onOpenRun={vi.fn()} />);
  const item = await screen.findByRole('button', {
    name: 'Expand Build application run #41 attempt 1',
  });
  const row = (number: number) =>
    screen
      .getByRole('button', { name: `Expand Build application run #${number} attempt 1` })
      .closest('tr')!;
  expect(row(42)).toHaveAttribute('aria-current', 'true');
  expect(within(row(40)).getByRole('cell', { name: 'Failure' })).toBeVisible();
  expect(within(row(41)).getAllByRole('cell', { name: '1m 30s' })).toHaveLength(1);
  expect(requests('job')).toHaveLength(0);

  await userEvent.click(item);
  const region = within(screen.getByRole('region', { name: 'Steps for run #41' }));
  expect(await region.findByRole('row', { name: 'Compile Success 1m 10s' })).toBeVisible();
  expect(requests('job')).toHaveLength(1);
  expect(requests('job-logs')).toHaveLength(0);
  await userEvent.click(item);
  expect(screen.queryByRole('region', { name: 'Steps for run #41' })).not.toBeInTheDocument();
});

it('paginates runs without requesting jobs and opens the chosen run', async () => {
  const second = { ...run, id: 101, number: 43, title: 'Fix tests' };
  serve({
    runs: byPage(
      () => json(runs([run], 2)),
      () => json(runs([second])),
    ),
  });
  const open = vi.fn();
  mount(<RunsView scope={scope} runnerId={11} runnerName="my-mac" onOpenRun={open} />);
  const initial = await screen.findByRole('button', { name: 'Open CI run #42 in example/app' });
  expect(String(fetchMock.mock.calls[0][0])).toContain('runner_id=11');
  await userEvent.click(initial);
  expect(open).toHaveBeenCalledWith(run);
  await userEvent.click(screen.getByRole('button', { name: 'Load more runs' }));
  expect(await screen.findByText('Fix tests')).toBeVisible();
  expect(requests('runs')).toHaveLength(2);
  expect(requests('job')).toHaveLength(0);
  expect(screen.queryByRole('button', { name: 'Load more runs' })).not.toBeInTheDocument();
});

it('pauses detail polling while hidden and stops it when the detail view unmounts', async () => {
  vi.useFakeTimers();
  serve({ run: ok({ run, jobs: [local] }) });
  const view = mount(<RunDetail run={run} onOpenHistory={vi.fn()} />);
  const tick = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));
  await tick(20);
  expect(requests('run')).toHaveLength(1);
  await tick(15_020);
  expect(requests('run')).toHaveLength(2);
  setHidden(true);
  await tick(60_000);
  expect(requests('run')).toHaveLength(2);
  setHidden(false);
  await tick(20);
  expect(requests('run')).toHaveLength(3);
  view.unmount();
  await tick(60_000);
  expect(requests('run')).toHaveLength(3);
});

it('aborts an in-flight job read on hiding the page', async () => {
  let signal: AbortSignal | null | undefined;
  serve({
    run: ok({ run, jobs: [local] }),
    job: (_url, init) => {
      signal = init?.signal;
      return new Promise<Response>((_resolve, reject) =>
        signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))),
      );
    },
  });
  mount(<RunDetail run={run} onOpenHistory={vi.fn()} />);
  fireEvent.click(await screen.findByRole('treeitem', { name: /Build application/ }));
  await waitFor(() => expect(signal).toBeDefined());
  setHidden(true);
  expect(signal?.aborted).toBe(true);
});

it('keeps literal job names and loads steps and logs from the keyboard', async () => {
  const nested = { ...local, name: 'Build / Test' };
  serve({
    run: ok({ run, jobs: [nested] }),
    job: ok({ ...fullJob, name: nested.name }),
  });
  const selection = vi.fn();
  mount(<RunDetail run={run} onOpenHistory={vi.fn()} onSelectionChange={selection} />);
  const tree = within(await screen.findByRole('tree', { name: 'Run jobs and steps' }));
  const job = tree.getByRole('treeitem', { name: /^Build \/ Test,/ });
  expect(job).toHaveAttribute('aria-expanded', 'false');
  job.focus();
  await userEvent.keyboard('{ArrowRight}');
  const stepItem = await tree.findByRole('treeitem', { name: 'Compile, Running' });
  expect(job).toHaveAttribute('aria-expanded', 'true');
  expect(stepItem).toHaveAttribute('aria-level', '2');
  expect(requests('job')).toHaveLength(1);
  await userEvent.keyboard('{ArrowRight}{Enter}');
  expect(selection).toHaveBeenLastCalledWith({ jobId: 900, stepNumber: 1 });
  expect(screen.getByRole('region', { name: 'Step 1: Compile' })).toBeVisible();
  await waitFor(() => expect(requests('job-logs')).toHaveLength(1));
});

it('collapses the phone run header behind Run details and keeps failures outside it', async () => {
  serve({ run: ok({ run, jobs: [{ ...local, status: 'completed', conclusion: 'failure' }] }) });
  mount(<RunDetail run={run} onOpenHistory={vi.fn()} />);
  const toggle = await screen.findByRole('button', { name: 'Run details' });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  const details = document.getElementById(toggle.getAttribute('aria-controls') ?? '');
  expect(details).toContainElement(screen.getByRole('button', { name: 'Refresh run' }));
  const [phoneFailures] = await screen.findAllByRole('group', { name: 'Failed jobs' });
  expect(details).not.toContainElement(phoneFailures);
  await userEvent.click(toggle);
  expect(toggle).toHaveAttribute('aria-expanded', 'true');
});

it('loads logs for controlled Step selection and allows returning to the Run overview', async () => {
  serve({ run: ok({ run, jobs: [local] }), job: ok(fullJob) });
  const view = mount(
    <RunDetail run={run} selection={{ jobId: 900, stepNumber: 1 }} onOpenHistory={vi.fn()} />,
  );
  expect(await screen.findByRole('region', { name: 'Step 1: Compile' })).toBeVisible();
  await waitFor(() => expect(requests('job-logs')).toHaveLength(1));
  view.rerender(wrap(<RunDetail run={run} selection={{ jobId: null }} onOpenHistory={vi.fn()} />));
  expect(await screen.findByRole('heading', { name: 'Pipeline' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Run details' })).toBeVisible();
  expect(screen.queryByRole('article', { name: 'Build application' })).not.toBeInTheDocument();
});

it('preserves a known runner identity when GitHub does not report its name', async () => {
  serve({
    run: ok({ run, jobs: [{ ...local, runner_name: null }] }),
    job: ok({ ...fullJob, runner_name: null }),
  });
  mount(<RunDetail run={run} onOpenHistory={vi.fn()} />);
  await userEvent.click(
    await screen.findByRole('treeitem', {
      name: /^Build application, Running, Runner #11 · Self-hosted · This device/,
    }),
  );
  const detail = within(await screen.findByRole('article', { name: 'Build application' }));
  expect(detail.getByText('Runner #11')).toBeVisible();
  expect(detail.queryByText('Unassigned')).not.toBeInTheDocument();
});

it('keeps run list loading non-textual until the result arrives', async () => {
  const finish = holdRequests();
  mount(<RunsView scope={{ organization: '', repository: '' }} onOpenRun={vi.fn()} />);
  expect(screen.getByRole('status', { name: 'Loading runs…' })).toHaveTextContent('');
  await finish(json(runs([run])));
  expect(await screen.findByRole('table', { name: 'Workflow runs' })).toBeVisible();
  expect(screen.queryByRole('status', { name: 'Loading runs…' })).not.toBeInTheDocument();
});

it('keeps the run shell visible while jobs and dependencies load', async () => {
  const finish = holdRequests();
  mount(<RunDetail run={run} onOpenHistory={vi.fn()} />);
  expect(screen.getByRole('status', { name: 'Loading jobs…' })).toHaveTextContent('');
  expect(screen.getByRole('heading', { name: 'CI #42' })).toBeVisible();
  await finish(json({ run, jobs: [local] }));
  expect(await screen.findByRole('complementary', { name: 'Jobs in this run' })).toBeVisible();
  expect(screen.getByRole('status', { name: 'Loading workflow dependencies…' })).toHaveTextContent(
    '',
  );
});

it('shows a textless history placeholder until the first page arrives', async () => {
  const finish = holdRequests();
  mount(<JobHistory job={fullJob} repository={run.repository} onOpenRun={vi.fn()} />);
  expect(screen.getByRole('status', { name: 'Loading job history…' })).toHaveTextContent('');
  await finish(json({ jobs: [historic], next_page: null, message: '' }));
  expect(await screen.findByRole('table', { name: 'Job execution history' })).toBeVisible();
  expect(screen.getByText('1 loaded')).toBeVisible();
  expect(screen.queryByRole('status', { name: 'Loading job history…' })).not.toBeInTheDocument();
});

it('keeps historical steps loading until the selected execution responds', async () => {
  let finish: (response: Response) => void = () => {};
  serve({
    'job-history': ok({ jobs: [historic], next_page: null, message: '' }),
    job: () => new Promise<Response>((resolve) => (finish = resolve)),
  });
  mount(<JobHistory job={fullJob} repository={run.repository} />);
  await userEvent.click(
    await screen.findByRole('button', { name: 'Expand Build application run #41 attempt 1' }),
  );
  expect(screen.getByRole('status', { name: 'Loading historical steps…' })).toBeVisible();
  expect(screen.queryByText('No steps are available for this job.')).not.toBeInTheDocument();
  await act(async () => finish(json({ ...historic, steps: [] })));
  expect(await screen.findByText('No steps are available for this job.')).toBeVisible();
  expect(
    screen.queryByRole('status', { name: 'Loading historical steps…' }),
  ).not.toBeInTheDocument();
});

it('keeps loaded runs in place when a refresh fails and offers a retry in the header', async () => {
  const state = { failing: false };
  serve({ runs: flakyRuns(state) });
  mount(<RunsView scope={scope} onOpenRun={vi.fn()} />);
  expect(await screen.findByText('Improve build')).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Workflow runs' })).toBeVisible();
  expect(screen.getByText('1 run loaded')).toBeVisible();
  state.failing = true;
  await userEvent.click(screen.getByRole('button', { name: 'Refresh runs' }));
  const notice = (await screen.findByText('Update failed')).closest<HTMLElement>('[role=status]')!;
  expect(notice).toHaveAttribute('title', 'GitHub is temporarily unavailable.');
  expect(notice.closest('header')).not.toBeNull();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  state.failing = false;
  await userEvent.click(within(notice).getByRole('button', { name: 'Retry', hidden: true }));
  await waitFor(() => expect(notice).toHaveAttribute('aria-hidden', 'true'));
  expect(screen.getByText('Improve build')).toBeVisible();
});

it('shows a retryable error state when runs fail before any data loads', async () => {
  const state = { failing: true };
  serve({ runs: flakyRuns(state) });
  mount(<RunsView scope={scope} onOpenRun={vi.fn()} />);
  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent(/Couldn't load workflow runs.*GitHub is temporarily unavailable/);
  state.failing = false;
  await userEvent.click(within(alert).getByRole('button', { name: 'Retry' }));
  expect(await screen.findByText('Improve build')).toBeVisible();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it('reports a failed next page beside Load more instead of above the table', async () => {
  serve({
    runs: byPage(
      () => json(runs([run], 2)),
      () => failure('Rate limit exceeded.'),
    ),
  });
  mount(<RunsView scope={scope} onOpenRun={vi.fn()} />);
  const loadMore = await screen.findByRole('button', { name: 'Load more runs' });
  await userEvent.click(loadMore);
  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent("Couldn't load more runs. Rate limit exceeded.");
  expect(alert.parentElement).toContainElement(loadMore);
  expect(screen.getByText('Update failed').closest('[role=status]')).toHaveAttribute(
    'aria-hidden',
    'true',
  );
  expect(screen.getByText('Improve build')).toBeVisible();
});

it.each([
  [2, true],
  [null, false],
])(
  'explains an empty runner history (next page %s offers older runs: %s)',
  async (nextPage, offered) => {
    serve({ runs: ok(runs([], nextPage)) });
    mount(<RunsView scope={scope} runnerId={11} runnerName="my-mac" onOpenRun={vi.fn()} />);
    expect(await screen.findByText('No runs for this runner yet')).toBeVisible();
    expect(screen.getByText(/^Searched example\/app\. Runs appear here when/)).toBeVisible();
    expect(!!screen.queryByRole('button', { name: 'Search older runs' })).toBe(offered);
    expect(screen.queryByRole('button', { name: 'Load more runs' })).not.toBeInTheDocument();
  },
);
