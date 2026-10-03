import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { createQueryClient } from '../../../../../shared/api/query-client';
import type { JobSummary, WorkflowRun } from '../../../data/types/activity-types';
import type { RunGraphData, RunGraphNode } from '../../models/run-graph';
import { RunDetail } from '../detail/RunDetail';
import { RunGraph } from './RunGraph';

const run: WorkflowRun = {
  id: 42,
  repository: 'example/app',
  workflow_id: 8,
  name: 'CI',
  title: 'Build changes',
  number: 42,
  attempt: 1,
  status: 'completed',
  conclusion: 'success',
  branch: 'main',
  head_sha: 'abcdef1234',
  url: 'https://github.com/example/app/actions/runs/42',
  created_at: null,
  started_at: null,
  updated_at: null,
};
const build: JobSummary = {
  id: 1,
  name: 'Build',
  workflow: 'CI',
  repository: run.repository,
  workflow_id: 8,
  status: 'completed',
  conclusion: 'success',
  branch: 'main',
  run_number: 42,
  run_id: 42,
  run_attempt: 1,
  url: `${run.url}/job/1`,
  runner_id: 11,
  runner_name: 'build-mac',
  host_type: 'self-hosted',
  device: 'this_device',
  started_at: null,
  completed_at: null,
};
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
});

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
  expect(screen.getByText(graph.message).closest('details')).not.toHaveAttribute('open');
});

it('keeps declared dependencies visible when runtime jobs have not been mapped', () => {
  render(
    <RunGraph
      graph={{
        ...graph,
        nodes: graph.nodes.map((item) => ({ ...item, job_ids: [] })),
        unmapped_job_ids: jobs.map((job) => job.id),
      }}
      jobs={jobs}
      onSelect={vi.fn()}
    />,
  );
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
  render(
    <RunGraph
      graph={{
        ...graph,
        nodes: [
          node(
            'test',
            'Test',
            instances.map((job) => job.id),
            [],
            true,
          ),
        ],
        unmapped_job_ids: [],
      }}
      jobs={instances}
      onSelect={vi.fn()}
    />,
  );
  expect(screen.queryByRole('button', { name: 'Open Test (6), Success' })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Show 2 more jobs' }));
  expect(screen.getByRole('button', { name: 'Open Test (6), Success' })).toBeVisible();
});

it('fetches the graph only for Overview and reuses it after visiting a job', async () => {
  fetchMock.mockImplementation(async (url) => {
    const path = String(url).split('?')[0];
    if (path === '/api/activity/run') return json({ run, jobs });
    if (path === '/api/activity/run-graph') return json(graph);
    if (path === '/api/activity/job')
      return json({
        ...build,
        steps: [
          {
            number: 1,
            name: 'Compile',
            status: 'completed',
            conclusion: 'success',
            started_at: null,
            completed_at: null,
          },
        ],
      });
    throw new Error(`Unexpected request: ${url}`);
  });
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
  render(
    <QueryClientProvider client={client}>
      <ControlledRun />
    </QueryClientProvider>,
  );
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
  render(
    <RunGraph
      graph={{
        ...graph,
        nodes: [node('test', expression, [2, 3], [], true)],
        unmapped_job_ids: [],
      }}
      jobs={jobs.slice(1, 3)}
      onSelect={vi.fn()}
    />,
  );
  expect(screen.getByText('test')).toHaveAttribute('title', expression);
  expect(screen.getByRole('group', { name: 'test, no dependencies' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Open Test (macOS), Success' })).toBeVisible();
});
