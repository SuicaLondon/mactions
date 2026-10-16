import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createQueryClient } from '../../../../shared/api/query-client';
import type { Runner } from '../../../../shared/api/types';
import { buildJob, remoteRunner, runner, summary, workflowRun } from '../../../../test/app-harness';
import type { JobSummary, Scope, WorkflowRun } from '../../../actions/data/types/activity-types';
import { ScopeFilters } from '../../../github/components/ScopeFilters';
import type { GitHubConnectionState } from '../models/runner-list-status';
import { RunnerList } from './RunnerList';

const local: Runner = {
  ...runner,
  name: 'build-mac',
  labels: ['release', 'macOS'],
  github_labels: undefined,
  busy: true,
};
const remote = { ...remoteRunner, labels: ['self-hosted'] };
const ownJob: JobSummary = {
  ...summary(buildJob),
  repository: 'example/build',
  workflow_id: 7,
  runner_id: 42,
  host_type: 'self-hosted',
  device: 'this_device',
  name: 'Build package',
  status: 'in_progress',
  conclusion: null,
};
const run: WorkflowRun = {
  ...workflowRun,
  status: 'in_progress',
  conclusion: null,
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

// Answers a request from the override when it returns one, else from the default fleet.
function serve(override: (path: string) => Response | Promise<Response> | void) {
  fetchMock.mockImplementation(
    async (url) => (await override(String(url))) ?? response(dataFor(url)),
  );
}

const hang = () => new Promise<Response>(() => {});

beforeEach(() => {
  client = createQueryClient();
  fetchMock.mockReset();
  serve(() => undefined);
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  client.clear();
  vi.unstubAllGlobals();
});

interface MountOptions {
  scope?: Scope;
  runners?: Runner[];
  connection?: GitHubConnectionState;
  search?: string;
}

function mountList(overrides: MountOptions = {}) {
  const props = {
    scope: overrides.scope ?? { organization: '', repository: '' },
    connection: overrides.connection ?? 'connected',
    local: { runners: overrides.runners ?? [local], onRefresh: vi.fn() },
    filters: { search: overrides.search ?? '', status: 'all', device: 'all' },
    rowCallbacks: { onOpen: vi.fn(), onDetails: vi.fn(), onMenu: vi.fn() },
    onAdd: vi.fn(),
    onInventoryUpdate: vi.fn(),
  } satisfies ComponentProps<typeof RunnerList>;
  render(
    <QueryClientProvider client={client}>
      <RunnerList {...props} />
    </QueryClientProvider>,
  );
  return props;
}

const rowOf = (name: string) => within(screen.getByRole('row', { name: new RegExp(name) }));
const findRow = async (name: string) =>
  within(await screen.findByRole('row', { name: new RegExp(name) }));

describe('compact runner activity', () => {
  it('keeps local runners available while GitHub connection is still being checked', () => {
    mountList({ connection: 'checking' });
    expect(screen.getByRole('status', { name: 'Loading current work' })).toHaveTextContent('');
    expect(screen.queryByText('GitHub disconnected')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Details for build-mac' })).toBeEnabled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows a neutral checking state instead of provisional local status until GitHub answers', async () => {
    mountList({ runners: [{ ...local, github_status: 'unknown', busy: null }] });
    const row = rowOf('build-mac');
    expect(row.getByText('Checking…')).toBeVisible();
    expect(row.getByLabelText('Checking labels')).toBeInTheDocument();
    expect(row.queryByText('Running locally')).not.toBeInTheDocument();
    expect(await row.findByText('Running locally')).toBeVisible();
    expect(row.queryByText('Checking…')).not.toBeInTheDocument();
    expect(row.getByText('release')).toBeVisible();
  });

  it('holds the runner count skeleton until inventory loads, then shows it cached on remount', async () => {
    const props = mountList();
    const heading = screen.getByRole('heading', { name: /^Runners/ });
    expect(within(heading).getByRole('status', { name: 'Loading runner count…' })).toBeVisible();
    await waitFor(() => expect(heading).toHaveTextContent('Runners 2'));
    cleanup();
    fetchMock.mockImplementation(hang);
    render(
      <QueryClientProvider client={client}>
        <RunnerList
          {...props}
          local={{ ...props.local, runners: [{ ...local, github_status: 'unknown' }] }}
        />
      </QueryClientProvider>,
    );
    expect(rowOf('remote-mac')).toBeTruthy();
    expect(screen.queryByText('Checking…')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^Runners/ })).toHaveTextContent('Runners 2');
  });

  it('shows identity, scope, status, labels and owned work in accessible columns', async () => {
    mountList();
    expect(
      screen
        .getAllByRole('columnheader')
        .map((header) => header.textContent || header.getAttribute('aria-label')),
    ).toEqual(['Runner', 'Scope', 'Status', 'Labels', 'Current work', 'Actions']);
    const cells = (await findRow('build-mac')).getAllByRole('gridcell');
    expect(cells[0]).toHaveTextContent('build-mac');
    expect(cells[0]).not.toHaveTextContent('Busy');
    expect(cells[1]).toHaveTextContent(/example\/build.*Repository/);
    expect(within(cells[2]).getByText('Busy')).toBeVisible();
    expect(await within(cells[4]).findByText('Build package')).toBeVisible();
    expect(within(cells[4]).queryByText('Other runner job')).not.toBeInTheDocument();
    expect(cells[3]).toHaveTextContent(/release.*macOS/);
    expect(within(cells[5]).getByRole('button', { name: 'Details for build-mac' })).toBeVisible();
    const external = rowOf('remote-mac');
    expect(external.getByText('Idle')).toBeVisible();
    expect(external.getByText('Read-only')).toBeVisible();
    expect(external.getByText('Other device')).toBeVisible();
    const coverage = screen.getByText('Data coverage').closest('details');
    expect(coverage).not.toHaveAttribute('open');
    expect(coverage).toHaveTextContent('20 running and 20 queued');
    await userEvent.click(screen.getByText('Data coverage'));
    expect(coverage).toHaveAttribute('open');
  });

  it('keeps extra labels discoverable and searches remote registration scopes', async () => {
    serve((path) => {
      if (path.startsWith('/api/activity/runners'))
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
    });
    mountList({ search: 'remote-organization' });
    const row = await findRow('remote-mac');
    expect(row.getByText('remote-organization')).toBeVisible();
    expect(row.getByText('Organization')).toBeVisible();
    expect(row.queryByText('ARM64')).not.toBeInTheDocument();
    expect(row.getByLabelText('2 more labels')).toHaveTextContent('+2');
    expect(row.getByText('self-hosted').closest('[role="gridcell"]')).toHaveAttribute(
      'title',
      'self-hosted, macOS, ARM64, release',
    );
    expect(screen.queryByRole('row', { name: /build-mac/ })).not.toBeInTheDocument();
  });

  it('shows an accessible placeholder while empty inventory is pending', () => {
    fetchMock.mockImplementation(hang);
    mountList({ runners: [] });
    expect(screen.getByRole('status', { name: 'Loading runners…' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
    expect(screen.queryByText('No Runners')).not.toBeInTheDocument();
  });

  it('opens Details separately while retaining keyboard activation and foreign read-only ownership', async () => {
    const { rowCallbacks } = mountList();
    await userEvent.click(await screen.findByRole('button', { name: 'Details for build-mac' }));
    const ids = expect.objectContaining({ localId: 1, githubId: 42 });
    expect(rowCallbacks.onDetails).toHaveBeenCalledWith(ids);
    expect(rowCallbacks.onOpen).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByRole('row', { name: /build-mac/ }), { key: 'Enter' });
    expect(rowCallbacks.onOpen).toHaveBeenCalledWith(ids);
    fireEvent.contextMenu(await screen.findByRole('row', { name: /remote-mac/ }));
    expect(rowCallbacks.onMenu).not.toHaveBeenCalled();
    fireEvent.contextMenu(screen.getByRole('row', { name: /build-mac/ }), {
      clientX: 20,
      clientY: 30,
    });
    expect(rowCallbacks.onMenu).toHaveBeenCalledWith(local, 20, 30);
  });

  it('bounds busy row summaries and makes extra assigned work discoverable', async () => {
    serve((path) => {
      if (path.startsWith('/api/activity/work'))
        return response({
          runs: [
            run,
            { ...run, id: 421, number: 43, name: 'Release' },
            { ...run, id: 422, number: 44, name: 'Publish' },
          ],
          message: '',
        });
    });
    mountList();
    const row = rowOf('build-mac');
    expect(await row.findByText('+1 runs')).toHaveAttribute('title', 'Publish #44');
    expect(row.getByText('CI')).toBeVisible();
    expect(row.getByText('Release')).toBeVisible();
    expect(row.queryByText('Publish')).not.toBeInTheDocument();
  });

  it('reports a failed next inventory page without hiding loaded runners', async () => {
    serve((path) => {
      if (!path.startsWith('/api/activity/runners')) return;
      if (new URL(path, 'http://localhost').searchParams.get('page') === '2')
        return response({ error: 'Rate limit exceeded.' }, 403);
      return response({ ...dataFor(path), next_page: 2 });
    });
    mountList();
    await userEvent.click(await screen.findByRole('button', { name: 'Load more runners' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't load more runners. Rate limit exceeded.",
    );
    expect(screen.queryByText('GitHub runners unavailable')).not.toBeInTheDocument();
    expect(rowOf('remote-mac')).toBeTruthy();
  });

  it('retains local runners and reports unavailable inventory with a retry', async () => {
    let denied = true;
    serve((path) => {
      if (path.startsWith('/api/activity/runners') && denied)
        return response({ error: 'Runner access denied' }, 403);
    });
    mountList();
    expect(rowOf('build-mac')).toBeTruthy();
    const notice = (await screen.findByText('GitHub runners unavailable')).closest<HTMLElement>(
      '[role="status"]',
    );
    expect(notice).toHaveAttribute('title', 'Runner access denied');
    denied = false;
    await userEvent.click(within(notice!).getByRole('button', { name: 'Retry', hidden: true }));
    await waitFor(() =>
      expect(screen.queryByText('GitHub runners unavailable')).not.toBeInTheDocument(),
    );
    expect(await findRow('remote-mac')).toBeTruthy();
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
