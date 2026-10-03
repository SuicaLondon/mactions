import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createQueryClient } from '../../../../shared/api/query-client';
import type { Runner } from '../../../../shared/api/types';
import type {
  ActivityRunner,
  JobSummary,
  WorkflowRun,
} from '../../../actions/data/types/activity-types';
import { ScopeFilters } from '../../../github/components/scope/ScopeFilters';
import { RunnerList } from '../components/RunnerList';

const local: Runner = {
  id: 1,
  name: 'build-mac',
  target: { kind: 'repo', name: 'example/build' },
  labels: ['release', 'macOS'],
  path: '/managed/runner-1',
  version: '2.999.0',
  github_id: 42,
  enabled: true,
  phase: 'ready',
  error: null,
  deregistered: false,
  registration_attempted: true,
  local_status: 'running',
  github_status: 'online',
  busy: true,
  interrupted: false,
};

const remote: ActivityRunner = {
  github_id: 88,
  local_id: null,
  name: 'remote-mac',
  status: 'online',
  busy: false,
  labels: ['self-hosted'],
  host_type: 'self-hosted',
  device: 'other_device',
};

const ownJob: JobSummary = {
  id: 101,
  name: 'Build package',
  status: 'in_progress',
  conclusion: null,
  workflow: 'CI',
  repository: 'example/build',
  workflow_id: 7,
  branch: 'main',
  run_id: 420,
  run_number: 42,
  run_attempt: 1,
  url: 'https://github.com/example/build/actions/runs/420/job/101',
  runner_id: 42,
  runner_name: local.name,
  host_type: 'self-hosted',
  device: 'this_device',
  started_at: null,
  completed_at: null,
};

const run: WorkflowRun = {
  id: 420,
  repository: 'example/build',
  workflow_id: 7,
  name: 'CI',
  title: 'Build package',
  number: 42,
  attempt: 1,
  status: 'in_progress',
  conclusion: null,
  branch: 'main',
  head_sha: 'abcdef',
  url: 'https://github.com/example/build/actions/runs/420',
  created_at: null,
  started_at: null,
  updated_at: null,
  jobs: [ownJob, { ...ownJob, id: 102, name: 'Other runner job', runner_id: 88 }],
};

const fetchMock = vi.fn<typeof fetch>();

let client: ReturnType<typeof createQueryClient>;

const response = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

function dataFor(url: RequestInfo | URL) {
  const path = String(url);
  if (path.startsWith('/api/activity/runners'))
    return { runners: [remote], next_page: null, message: '', refresh_after_seconds: 30 };
  if (path.startsWith('/api/activity/work'))
    return {
      runs: [run],
      message: 'Current work covers up to 20 running and 20 queued runs per repository.',
      refresh_after_seconds: 30,
    };
  if (path.startsWith('/api/github/targets'))
    return { items: [{ kind: 'org', name: 'another', private: false }], next_page: null };
  return { items: [], next_page: null };
}

beforeEach(() => {
  client = createQueryClient();
  fetchMock.mockReset().mockImplementation(async (url) => response(dataFor(url)));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  client.clear();
  vi.unstubAllGlobals();
});

function mountList(overrides: Partial<ComponentProps<typeof RunnerList>> = {}) {
  const props = {
    scope: { organization: '', repository: '' },
    runners: [local],
    connected: true,
    search: '',
    status: 'all',
    device: 'all',
    onOpen: vi.fn(),
    onDetails: vi.fn(),
    onMenu: vi.fn(),
    onAdd: vi.fn(),
    onRefreshLocal: vi.fn(),
    localFetching: false,
    onInventoryUpdate: vi.fn(),
    ...overrides,
  };
  render(
    <QueryClientProvider client={client}>
      <RunnerList {...props} />
    </QueryClientProvider>,
  );
  return props;
}

describe('compact runner activity', () => {
  it('keeps local runners available while GitHub connection is still being checked', () => {
    mountList({ connected: undefined });
    expect(screen.getByRole('status', { name: 'Loading current work' })).toHaveTextContent('');
    expect(screen.queryByText('GitHub disconnected')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Details for build-mac' })).toBeEnabled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('separates runner identity, state and current work into aligned accessible columns', async () => {
    mountList();
    expect(
      screen
        .getAllByRole('columnheader')
        .map((header) => header.textContent || header.getAttribute('aria-label')),
    ).toEqual(['Runner', 'Scope', 'Status', 'Labels', 'Current work', 'Actions']);
    const row = within(await screen.findByRole('row', { name: /build-mac/ }));
    const cells = row.getAllByRole('gridcell');
    expect(cells).toHaveLength(6);
    expect(cells[0]).toHaveTextContent('build-mac');
    expect(cells[0]).not.toHaveTextContent('Busy');
    expect(within(cells[2]).getByText('Busy')).toBeVisible();
    expect(await within(cells[4]).findByText('Build package')).toBeVisible();
    expect(within(cells[5]).getByRole('button', { name: 'Details for build-mac' })).toBeVisible();
    const external = within(screen.getByRole('row', { name: /remote-mac/ }));
    expect(external.getByText('Idle')).toBeVisible();
    expect(external.getByText('Read-only')).toBeVisible();
  });

  it('shows scope and labels with owned work, keeping coverage in optional details', async () => {
    mountList();
    const row = within(await screen.findByRole('row', { name: /build-mac/ }));
    expect(await row.findByText('Build package')).toBeVisible();
    expect(row.queryByText('Other runner job')).not.toBeInTheDocument();
    expect(row.getByText('release')).toBeVisible();
    expect(row.getByText('macOS')).toBeVisible();
    expect(row.getByText('example/build')).toBeVisible();
    expect(row.getByText('Repository')).toBeVisible();
    expect(
      screen.queryByText('Open a runner to see its runs. Use Details to manage it.'),
    ).not.toBeInTheDocument();
    const coverage = screen.getByText('Data coverage').closest('details');
    expect(coverage).not.toHaveAttribute('open');
    expect(coverage).toHaveTextContent('20 running and 20 queued');
    await userEvent.click(screen.getByText('Data coverage'));
    expect(coverage).toHaveAttribute('open');
    const external = within(screen.getByRole('row', { name: /remote-mac/ }));
    expect(external.getByText('Read-only')).toBeVisible();
    expect(external.queryByText('No assigned jobs in loaded work')).not.toBeInTheDocument();
  });

  it('keeps extra labels discoverable and searches remote registration scopes', async () => {
    fetchMock.mockImplementation(async (url) => {
      if (String(url).startsWith('/api/activity/runners'))
        return response({
          runners: [
            {
              ...remote,
              target: { kind: 'org', name: 'remote-organization' },
              labels: ['self-hosted', 'macOS', 'ARM64', 'release'],
            },
          ],
          next_page: null,
          message: '',
        });
      return response(dataFor(url));
    });
    mountList({ search: 'remote-organization' });
    const row = within(await screen.findByRole('row', { name: /remote-mac/ }));
    expect(row.getByText('remote-organization')).toBeVisible();
    expect(row.getByText('Organization')).toBeVisible();
    expect(row.getByText('self-hosted')).toBeVisible();
    expect(row.getByLabelText('1 more labels')).toHaveTextContent('+1');
    expect(row.getByText('self-hosted').closest('[role="gridcell"]')).toHaveAttribute(
      'title',
      'self-hosted, macOS, ARM64, release',
    );
    expect(screen.queryByRole('row', { name: /build-mac/ })).not.toBeInTheDocument();
  });

  it('distinguishes an idle runner from unavailable work', async () => {
    fetchMock.mockImplementation(async (url) => {
      if (String(url).startsWith('/api/activity/work')) return response({ runs: [], message: '' });
      return response(dataFor(url));
    });
    mountList();
    const row = within(await screen.findByRole('row', { name: /remote-mac/ }));
    expect(await row.findByText('No active jobs')).toBeVisible();
    expect(row.queryByText('Work unavailable')).not.toBeInTheDocument();
  });

  it('shows an accessible placeholder while empty inventory is pending', async () => {
    fetchMock.mockImplementation(() => new Promise<Response>(() => {}));
    mountList({ runners: [] });
    expect(screen.getByRole('status', { name: 'Loading runners…' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
    expect(screen.queryByText('No Runners')).not.toBeInTheDocument();
  });

  it('opens Details separately while retaining keyboard activation and foreign read-only ownership', async () => {
    const props = mountList();
    await userEvent.click(await screen.findByRole('button', { name: 'Details for build-mac' }));
    expect(props.onDetails).toHaveBeenCalledWith(
      expect.objectContaining({ localId: 1, githubId: 42 }),
    );
    expect(props.onOpen).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByRole('row', { name: /build-mac/ }), { key: 'Enter' });
    expect(props.onOpen).toHaveBeenCalledWith(
      expect.objectContaining({ localId: 1, githubId: 42 }),
    );
    fireEvent.contextMenu(await screen.findByRole('row', { name: /remote-mac/ }));
    expect(props.onMenu).not.toHaveBeenCalled();
    fireEvent.contextMenu(screen.getByRole('row', { name: /build-mac/ }), {
      clientX: 20,
      clientY: 30,
    });
    expect(props.onMenu).toHaveBeenCalledWith(local, 20, 30);
  });

  it('bounds busy row summaries and makes extra assigned work discoverable', async () => {
    fetchMock.mockImplementation(async (url) => {
      if (String(url).startsWith('/api/activity/work'))
        return response({
          runs: [
            run,
            { ...run, id: 421, number: 43, name: 'Release' },
            { ...run, id: 422, number: 44, name: 'Publish' },
          ],
          message: '',
        });
      return response(dataFor(url));
    });
    mountList();
    const row = within(screen.getByRole('row', { name: /build-mac/ }));
    expect(await row.findByText('+1 runs')).toHaveAttribute('title', 'Publish #44');
    expect(row.getByText('CI')).toBeVisible();
    expect(row.getByText('Release')).toBeVisible();
    expect(row.queryByText('Publish')).not.toBeInTheDocument();
  });

  it('retains local runners and exposes coverage errors when remote inventory is unavailable', async () => {
    fetchMock.mockImplementation(async (url) => {
      if (String(url).startsWith('/api/activity/runners'))
        return response({ error: 'Runner access denied' }, 403);
      return response(dataFor(url));
    });
    mountList();
    expect(screen.getByRole('row', { name: /build-mac/ })).toBeVisible();
    const notice = await screen.findByText('Some data is unavailable');
    expect(notice.closest('details')).toHaveAttribute('open');
    expect(await screen.findByText('Runner access denied')).toBeVisible();
  });
});

describe('compact scope filters', () => {
  it('fetches options only on opening and clears a Repository outside the newly selected Organization', async () => {
    const onChange = vi.fn();
    render(
      <QueryClientProvider client={client}>
        <ScopeFilters
          scope={{ organization: 'example', repository: 'example/build' }}
          runners={[local]}
          connected
          onChange={onChange}
        />
      </QueryClientProvider>,
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText('Org')).toBeVisible();
    expect(screen.getByText('Repo')).toBeVisible();
    expect(screen.queryByText('Showing the selected repository.')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('combobox', { name: 'Filter organization' }));
    await userEvent.click(await screen.findByRole('option', { name: /another.*Organization/ }));
    expect(onChange).toHaveBeenCalledWith({ organization: 'another', repository: '' });
    await waitFor(() =>
      expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
        '/api/github/targets?kind=org&page=1',
      ]),
    );
  });
});
