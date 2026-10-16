import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode, useState } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { createQueryClient } from '../../../../../shared/api/query-client';
import { makeJobSummary, makeRun } from '../../../../../test/activity-fixtures';
import type { JobSummary } from '../../../data/types/activity-types';
import type { RunGraphData, RunGraphNode } from '../../models/run-graph';
import { RunDetail } from '../detail/RunDetail';
import { RunGraph } from './RunGraph';
import { RunGraphOverview } from './RunGraphOverview';

const run = makeRun({ title: 'Build changes' });
const build = makeJobSummary({
  runner_id: 11,
  runner_name: 'build-mac',
  host_type: 'self-hosted',
  device: 'this_device',
});
const jobs: JobSummary[] = [
  build,
  { ...build, id: 2, name: 'Test (macOS)' },
  { ...build, id: 3, name: 'Test (Linux)' },
  { ...build, id: 4, name: 'Deploy' },
  { ...build, id: 5, name: 'Runtime-only job' },
];
const node = (
  id: string,
  name: string,
  job_ids: number[],
  needs: string[] = [],
  matrix = false,
): RunGraphNode => ({ id, name, job_ids, needs, matrix, reusable: false });
const graph: RunGraphData = {
  state: 'partial',
  message: 'A dynamic job name could not be matched.',
  nodes: [
    node('build', 'Build', [1]),
    node('test', 'Test', [2, 3], ['build'], true),
    node('deploy', 'Deploy', [4], ['test']),
  ],
  unmapped_job_ids: [5],
  source: {
    repository: run.repository,
    path: '.github/workflows/ci.yml',
    sha: run.head_sha,
    run_attempt: 1,
    url: `https://github.com/example/app/blob/${run.head_sha}/.github/workflows/ci.yml`,
  },
};
let client: ReturnType<typeof createQueryClient>;
const fetchMock = vi.fn<typeof fetch>();
const json = (value: unknown) =>
  new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });
beforeEach(() => {
  client = createQueryClient();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  client.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function withClient(element: ReactNode) {
  return render(<QueryClientProvider client={client}>{element}</QueryClientProvider>);
}
function serveRun(runJobs: JobSummary[]) {
  fetchMock.mockImplementation(async (input) => {
    const url = new URL(String(input), 'http://localhost');
    if (url.pathname === '/api/activity/run') return json({ run, jobs: runJobs });
    if (url.pathname === '/api/activity/run-graph') return json(graph);
    if (url.pathname === '/api/activity/job') {
      const id = Number(url.searchParams.get('job_id'));
      return json({ ...runJobs.find((job) => job.id === id), steps: [] });
    }
    throw new Error(`Unexpected request: ${url}`);
  });
}
function mountRun(runJobs: JobSummary[]) {
  serveRun(runJobs);
  withClient(<RunDetail run={run} onOpenHistory={vi.fn()} />);
}
function renderGraph(changes: Partial<RunGraphData>, graphJobs = jobs) {
  render(<RunGraph graph={{ ...graph, ...changes }} jobs={graphJobs} onSelect={vi.fn()} />);
}

it('shows declared dependencies, selects individual matrix instances and separates unknown mappings', async () => {
  const select = vi.fn();
  render(<RunGraph graph={graph} jobs={jobs} highlightRunnerId={11} onSelect={select} />);
  expect(screen.getByRole('group', { name: 'Test, depends on Build' })).toBeVisible();
  expect(screen.getByRole('group', { name: 'Deploy, depends on Test' })).toBeVisible();
  expect(screen.getByText('Matrix · 2')).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: 'Open Test (Linux), Success' }));
  expect(select).toHaveBeenCalledWith(3);
  expect(screen.getByRole('heading', { name: 'Unmapped jobs 1' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Open Runtime-only job, Success' })).toBeVisible();
  expect(screen.getByRole('link', { name: 'Workflow source' })).toHaveAttribute(
    'href',
    graph.source!.url,
  );
  expect(screen.getByRole('link', { name: 'Workflow source' })).toHaveAttribute(
    'title',
    `Workflow source: ${graph.source!.path} @ ${graph.source!.sha}`,
  );
  expect(screen.getByText(graph.message).closest('details')).not.toHaveAttribute('open');
});

it('marks jobs that ran on the page runner alone, in groups, and among unmapped jobs', () => {
  const remote = { ...build, id: 3, name: 'Test (Linux)', runner_id: 12 };
  const mixed = [...jobs.filter((job) => job.id !== remote.id), remote];
  render(<RunGraph graph={graph} jobs={mixed} highlightRunnerId={11} onSelect={vi.fn()} />);
  const marked = (name: string) =>
    screen
      .getByRole('button', { name: `Open ${name}, Success` })
      .hasAttribute('data-selected-runner');
  expect(marked('Build')).toBe(true);
  expect(marked('Test (macOS)')).toBe(true);
  expect(marked('Test (Linux)')).toBe(false);
  expect(marked('Runtime-only job')).toBe(true);
});

it('keeps declared dependencies visible when runtime jobs have not been mapped', () => {
  renderGraph({
    nodes: graph.nodes.map((item) => ({ ...item, job_ids: [] })),
    unmapped_job_ids: jobs.map((job) => job.id),
  });
  expect(screen.getByRole('group', { name: 'Deploy, depends on Test' })).toBeVisible();
  expect(screen.getAllByText('No matched execution')).toHaveLength(3);
  expect(screen.getByRole('heading', { name: 'Unmapped jobs 5' })).toBeVisible();
});

it('opens the remaining matrix jobs without making a workflow node ambiguous', async () => {
  const instances = Array.from({ length: 6 }, (_, index) => ({
    ...build,
    id: index + 10,
    name: `Test (${index + 1})`,
  }));
  const ids = instances.map((job) => job.id);
  renderGraph({ nodes: [node('test', 'Test', ids, [], true)], unmapped_job_ids: [] }, instances);
  expect(screen.queryByRole('button', { name: 'Open Test (6), Success' })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Show 2 more jobs' }));
  expect(screen.getByRole('button', { name: 'Open Test (6), Success' })).toBeVisible();
});

it('fetches the graph only for Overview and reuses it after visiting a job', async () => {
  serveRun(jobs);
  function ControlledRun() {
    const [selection, setSelection] = useState<{ jobId: number | null; stepNumber?: number }>({
      jobId: 1,
    });
    return (
      <RunDetail
        run={run}
        selection={selection}
        onSelectionChange={setSelection}
        onOpenHistory={vi.fn()}
      />
    );
  }
  withClient(<ControlledRun />);
  await screen.findByRole('article', { name: 'Build' });
  const reads = () =>
    fetchMock.mock.calls.filter(([url]) => String(url).startsWith('/api/activity/run-graph?'));
  expect(reads()).toHaveLength(0);
  await userEvent.click(screen.getByRole('button', { name: 'Overview' }));
  const pipeline = within(await screen.findByRole('region', { name: 'Job dependency pipeline' }));
  expect(reads()).toHaveLength(1);
  await userEvent.click(pipeline.getByRole('button', { name: 'Open Build, Success' }));
  await screen.findByRole('article', { name: 'Build' });
  expect(screen.queryByRole('region', { name: 'Job dependency pipeline' })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Overview' }));
  await screen.findByRole('region', { name: 'Job dependency pipeline' });
  await waitFor(() => expect(reads()).toHaveLength(1));
  expect(
    fetchMock.mock.calls.some(([url]) => String(url).startsWith('/api/activity/job-logs')),
  ).toBe(false);
});

it('uses the workflow job identifier for unevaluated matrix names and keeps the source name discoverable', () => {
  const expression = 'Test (${{ matrix.os }})';
  renderGraph(
    { nodes: [node('test', expression, [2, 3], [], true)], unmapped_job_ids: [] },
    jobs.slice(1, 3),
  );
  expect(screen.getByText('test')).toHaveAttribute('title', expression);
  expect(screen.getByRole('group', { name: 'test, no dependencies' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Open Test (macOS), Success' })).toBeVisible();
});

it('surfaces failed jobs above the pipeline and opens the selected failure', async () => {
  const failed = { ...build, id: 4, name: 'Portal / Storybook', conclusion: 'failure' };
  mountRun([build, failed]);
  await screen.findByRole('region', { name: 'Job dependency pipeline' });
  expect(screen.getByText('1 of 2 jobs failed')).toBeVisible();
  // One callout per layout: beside the pipeline from md, at the top of the run body below it.
  const callout = within(screen.getAllByRole('group', { name: 'Failed jobs' })[1]);
  expect(callout.getByText('1 failed:')).toBeVisible();
  await userEvent.click(
    callout.getByRole('button', { name: 'Open failed job Portal / Storybook' }),
  );
  expect(await screen.findByRole('article', { name: 'Portal / Storybook' })).toBeVisible();
  expect(screen.queryByRole('group', { name: 'Failed jobs' })).not.toBeInTheDocument();
});

it('keeps the compact Jobs disclosure collapsed when the run has failures', async () => {
  mountRun([build, { ...build, id: 4, name: 'Deploy', conclusion: 'failure' }]);
  const toggle = await screen.findByRole('button', { name: 'Jobs 2' });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await userEvent.click(toggle);
  expect(toggle).toHaveAttribute('aria-expanded', 'true');
});

const failingJobs = jobs.map((job) => {
  if (job.id === 3 || job.id === 4) return { ...job, conclusion: 'failure' };
  return job;
});

it('marks failed groups and reveals the first failure once', () => {
  const view = render(<RunGraph graph={graph} jobs={failingJobs} onSelect={vi.fn()} />);
  const viewport = screen.getByLabelText('Scrollable dependency graph');
  // The matrix group in the second layer is the first failure; jsdom reports no width.
  expect(viewport.scrollLeft).toBeGreaterThan(0);
  const test = within(screen.getByRole('group', { name: 'Test, depends on Build' }));
  expect(test.getByText(', 1 failed')).toBeInTheDocument();
  expect(test.getByRole('button', { name: 'Open Test (Linux), Failure' })).toBeVisible();
  viewport.scrollLeft = 0;
  view.rerender(<RunGraph graph={graph} jobs={[...failingJobs]} onSelect={vi.fn()} />);
  expect(viewport.scrollLeft).toBe(0);
});

it.each([
  { scrollWidth: 1000, calls: [[0]] },
  { scrollWidth: 300, calls: [] },
])(
  'starts a $scrollWidth px graph in a 300 px viewport at the root column',
  ({ scrollWidth, calls }) => {
    vi.spyOn(Element.prototype, 'scrollWidth', 'get').mockReturnValue(scrollWidth);
    vi.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(300);
    // Spy on the setter first: a setter spy created after the getter stub captures that stub,
    // and restoring it would leave scrollLeft at 500 for later tests.
    const scrolledTo = vi.spyOn(Element.prototype, 'scrollLeft', 'set');
    // A restored or anchored scroll position would otherwise hide the root column.
    vi.spyOn(Element.prototype, 'scrollLeft', 'get').mockReturnValue(500);
    render(<RunGraph graph={graph} jobs={jobs} onSelect={vi.fn()} />);
    expect(scrolledTo.mock.calls).toEqual(calls);
  },
);

it('stacks dependency levels vertically on phones instead of a panning canvas', async () => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({ matches: true, media: query })),
  );
  const select = vi.fn();
  render(<RunGraph graph={graph} jobs={failingJobs} onSelect={select} />);
  expect(screen.queryByLabelText('Scrollable dependency graph')).not.toBeInTheDocument();
  const items = within(screen.getByRole('list', { name: 'Dependency levels' })).getAllByRole(
    'listitem',
  );
  expect(items.map((item) => within(item).getByRole('heading').textContent)).toEqual([
    'Level 1',
    'Level 2',
    'Level 3',
  ]);
  const test = within(within(items[1]).getByRole('group', { name: 'Test, depends on Build' }));
  expect(test.getByText('needs: Build')).toBeVisible();
  expect(test.getByText('Matrix · 2')).toBeVisible();
  await userEvent.click(test.getByRole('button', { name: 'Open Test (Linux), Failure' }));
  expect(select).toHaveBeenCalledWith(3);
  expect(within(items[0]).queryByText(/^needs:/)).not.toBeInTheDocument();
});

it('summarizes job progress and omits the failure callout when every job succeeded', async () => {
  mountRun(jobs);
  expect(await screen.findByText('5 jobs')).toBeVisible();
  await screen.findByRole('region', { name: 'Job dependency pipeline' });
  expect(screen.queryByRole('group', { name: 'Failed jobs' })).not.toBeInTheDocument();
});

it('collapses the compact Jobs disclosure once a job is selected', async () => {
  mountRun(jobs);
  const toggle = await screen.findByRole('button', { name: 'Jobs 5' });
  expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await userEvent.click(toggle);
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await userEvent.click(screen.getByRole('button', { name: 'Open Build, Success' }));
  await screen.findByRole('article', { name: 'Build' });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await userEvent.click(toggle);
  await userEvent.click(screen.getByRole('button', { name: 'Overview' }));
  expect(toggle).toHaveAttribute('aria-expanded', 'true');
});

it('reports a failed graph refresh in the header while the earlier graph stays', async () => {
  fetchMock.mockResolvedValueOnce(json(graph));
  withClient(<RunGraphOverview run={run} jobs={jobs} onSelect={vi.fn()} />);
  const pipeline = await screen.findByRole('region', { name: 'Job dependency pipeline' });
  // The slot is reserved before any failure, so reporting one moves nothing.
  const indicator = within(pipeline).getByRole('status', { hidden: true });
  expect(indicator).toHaveAttribute('aria-hidden', 'true');
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify({ error: 'GitHub is unavailable.' }), { status: 502 }),
  );
  await act(() => client.refetchQueries());
  await waitFor(() => expect(indicator).not.toHaveAttribute('aria-hidden'));
  expect(indicator).toHaveAttribute('title', 'GitHub is unavailable.');
  expect(within(indicator).getByText(': GitHub is unavailable.')).toBeInTheDocument();
  expect(within(pipeline).getByRole('group', { name: 'Deploy, depends on Test' })).toBeVisible();
  fetchMock.mockResolvedValue(json(graph));
  // The Retry button may sit in a popover, which jsdom treats as hidden.
  await userEvent.click(within(indicator).getByRole('button', { name: 'Retry', hidden: true }));
  await waitFor(() => expect(indicator).toHaveAttribute('aria-hidden', 'true'));
});
