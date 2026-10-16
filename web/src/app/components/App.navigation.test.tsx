import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';

import {
  activityDataFor,
  backButton,
  breadcrumbs,
  client,
  mount,
  olderRun,
  openDetails,
  ready,
  requested,
  requestedActivity,
  response,
  savedNavigation,
  serve,
  setupAppTests,
  viewButton,
  workflowRun,
} from '../../test/app-harness';

setupAppTests();

type User = ReturnType<typeof userEvent.setup>;

const saveNavigation = (state: object) =>
  localStorage.setItem('mactions.navigation.v1', JSON.stringify(state));
const serveActivity = () => serve(undefined, activityDataFor);
const jobsInRun = () => within(screen.getByRole('complementary', { name: 'Jobs in this run' }));

async function openRun(user: User, number = 42) {
  await user.click(
    await screen.findByRole('button', { name: `Open CI run #${number} in example/build` }),
  );
}

async function openBuildJob(user: User) {
  await screen.findByRole('complementary', { name: 'Jobs in this run' });
  await user.click(jobsInRun().getByRole('treeitem', { name: /Build application/ }));
  return within(await screen.findByRole('article', { name: 'Build application' }));
}

async function openJobHistory(user: User) {
  const job = await openBuildJob(user);
  await user.click(job.getByRole('button', { name: 'Job history' }));
  return within(await screen.findByRole('region', { name: 'History for Build application' }));
}

it('uses named ancestry for Runner, Run, Job and Step navigation without global filters', async () => {
  saveNavigation({
    view: 'runners',
    scope: { organization: 'example', repository: 'example/build' },
    runnerSearch: 'build',
  });
  serveActivity();
  await ready(false);
  const user = userEvent.setup();
  await user.click(screen.getByRole('row', { name: /build-mac-1/ }));
  expect(backButton()).toHaveTextContent('Back to Runners');
  // Detail pages keep the header's view control; Add runner lives in the Runners table header.
  expect(screen.getByRole('group', { name: 'Activity view' })).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Add runner' })).not.toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Activity scope' })).not.toBeInTheDocument();
  expect(screen.getByRole('combobox', { name: 'Run status' })).toBeInTheDocument();

  await openRun(user);
  expect(backButton()).toHaveTextContent('Back to build-mac-1');
  expect(
    breadcrumbs()
      .getAllByRole('button')
      .map((button) => button.textContent),
  ).toEqual(['Runners', 'build-mac-1']);
  expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  const tree = within(await screen.findByRole('tree', { name: 'Run jobs and steps' }));
  await user.click(tree.getByRole('treeitem', { name: /Build application/ }));
  const checkout = await tree.findByRole('treeitem', { name: 'Checkout, Success' });
  expect(checkout).toHaveAttribute('aria-level', '2');
  await user.click(checkout);
  expect(await screen.findByRole('region', { name: 'Step 1: Checkout' })).toBeVisible();
  expect(breadcrumbs().getByText('Checkout')).toHaveAttribute('aria-current', 'page');
  expect(backButton()).toHaveTextContent('Back to Build application');
  expect(requestedActivity('job-logs')).toHaveLength(1);

  await user.click(breadcrumbs().getByRole('button', { name: 'Build application' }));
  expect(screen.queryByRole('region', { name: 'Step 1: Checkout' })).not.toBeInTheDocument();
  expect(screen.getByRole('table', { name: 'Steps in this job' })).toBeVisible();
  expect(backButton()).toHaveTextContent('Back to CI #42');
  const detailReads = requestedActivity('job').length;
  await user.click(
    within(screen.getByRole('article', { name: 'Build application' })).getByRole('button', {
      name: 'Job history',
    }),
  );
  await screen.findByRole('region', { name: 'History for Build application' });
  expect(backButton()).toHaveTextContent('Back to Build application');
  expect(requestedActivity('job-history')[0].searchParams.get('job_name')).toBe(
    'Build application',
  );

  await user.click(breadcrumbs().getByRole('button', { name: 'build-mac-1' }));
  expect(
    await screen.findByRole('heading', { name: /^Workflow runs for build-mac-1/ }),
  ).toBeVisible();
  await user.click(breadcrumbs().getByRole('button', { name: 'Runners' }));
  expect(screen.getByRole('searchbox', { name: 'Search runners' })).toHaveValue('build');
  expect(savedNavigation().scope).toEqual({
    organization: 'example',
    repository: 'example/build',
  });
  expect(requestedActivity('job')).toHaveLength(detailReads);
  expect(requestedActivity('job-logs')).toHaveLength(1);
});

it('restores a Job and Step from the URL after a reload', async () => {
  window.history.replaceState(null, '', '/#/runs/example/build/420/jobs/101?attempt=1&step=1');
  serveActivity();
  mount();
  expect(await screen.findByRole('region', { name: 'Step 1: Checkout' })).toBeVisible();
  // The URL carries only identities; names fill in as the Run and Job load.
  await waitFor(() =>
    expect(
      breadcrumbs()
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['Runs', 'CI #42', 'Build application']),
  );
  expect(backButton()).toHaveTextContent('Back to Build application');
  await userEvent.click(backButton());
  expect(window.location.hash).toBe('#/runs/example/build/420/jobs/101?attempt=1');
  expect(screen.getByRole('table', { name: 'Steps in this job' })).toBeVisible();
});

it('falls back to the list for an unknown URL', async () => {
  window.history.replaceState(null, '', '/#/runs/example/build/not-a-run');
  await ready(false);
  expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
  expect(window.location.hash).toBe('#/runners');
});

it('follows browser Back and Forward between the Runs list and a Run', async () => {
  window.history.replaceState(null, '', '/#/runs');
  serveActivity();
  mount();
  const user = userEvent.setup();
  await openRun(user);
  expect(window.location.hash).toBe('#/runs/example/build/420?attempt=1');
  expect(screen.getByRole('region', { name: 'Run details for CI #42' })).toBeVisible();
  act(() => window.history.back());
  expect(await screen.findByRole('heading', { name: 'Workflow runs' })).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
  act(() => window.history.forward());
  expect(await screen.findByRole('region', { name: 'Run details for CI #42' })).toBeVisible();
  expect(backButton()).toHaveTextContent('Back to Runs');
  // In-app Back pops the browser entry instead of adding one.
  await user.click(backButton());
  await waitFor(() => expect(window.location.hash).toBe('#/runs'));
  act(() => window.history.forward());
  expect(await screen.findByRole('region', { name: 'Run details for CI #42' })).toBeVisible();
});

it('preserves History result filters and expanded Steps after visiting a historical Run', async () => {
  serveActivity();
  await ready(false);
  const user = userEvent.setup();
  await user.click(screen.getByRole('row', { name: /build-mac-1/ }));
  await openRun(user);
  let history = await openJobHistory(user);
  const previous = 'Expand Build application run #41 attempt 1';
  await history.findByRole('button', { name: previous });
  await user.click(history.getByRole('combobox', { name: 'Filter by status' }));
  await user.click(screen.getByRole('option', { name: 'Failure' }));
  await user.click(history.getByRole('button', { name: previous }));
  await history.findByRole('table', { name: 'Step results and duration' });
  const detailReads = requestedActivity('job').length;
  await user.click(history.getByRole('button', { name: 'Open run #41' }));
  await screen.findByRole('region', { name: 'Run details for CI #41' });
  await user.click(backButton());
  history = within(screen.getByRole('region', { name: 'History for Build application' }));
  expect(history.getByText('Failure', { selector: '[class$="singleValue"] span' })).toBeVisible();
  expect(history.getByRole('button', { name: previous })).toHaveAttribute('aria-expanded', 'true');
  expect(
    history.queryByRole('button', { name: 'Expand Build application run #42 attempt 1' }),
  ).not.toBeInTheDocument();
  expect(
    within(history.getByRole('table', { name: 'Step results and duration' })).getByRole('row', {
      name: 'Compile application Failure 2m 0s',
    }),
  ).toBeVisible();
  expect(requestedActivity('job')).toHaveLength(detailReads);
  expect(requestedActivity('job-logs')).toHaveLength(0);
});

it('restores both loaded Run pages after inactive queries expire without waiting for refetch', async () => {
  let blockParents = false;
  serve((path, options) => {
    const parsed = new URL(path, 'http://localhost');
    if (blockParents && ['/api/activity/runs', '/api/activity/run'].includes(parsed.pathname))
      return new Promise<Response>((_resolve, reject) =>
        options?.signal?.addEventListener(
          'abort',
          () => reject(new DOMException('Aborted', 'AbortError')),
          { once: true },
        ),
      );
    if (parsed.pathname !== '/api/activity/runs') return;
    if (parsed.searchParams.get('page') === '2')
      return response({ runs: [olderRun], next_page: null, message: '' });
    return response({ runs: [workflowRun], next_page: 2, message: '' });
  }, activityDataFor);
  await ready(false);
  const user = userEvent.setup();
  await user.click(viewButton('Runs'));
  await user.click(await screen.findByRole('button', { name: 'Load more runs' }));
  await screen.findByRole('button', { name: 'Open CI run #41 in example/build' });
  await openRun(user);
  const history = await openJobHistory(user);
  await history.findByRole('button', { name: 'Expand Build application run #41 attempt 1' });
  const detailReads = requestedActivity('job').length;
  blockParents = true;
  act(() => {
    client.removeQueries({ queryKey: ['activity-runs'] });
    client.removeQueries({ queryKey: ['activity-run'] });
  });
  fireEvent.click(backButton());
  expect(screen.getByRole('article', { name: 'Build application' })).toBeVisible();
  expect(jobsInRun().getByRole('treeitem', { name: /Build application/ })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  // Back from a selected Job returns to its Run overview, then to the Runs list.
  expect(backButton()).toHaveTextContent('Back to CI #42');
  fireEvent.click(backButton());
  expect(screen.queryByRole('article', { name: 'Build application' })).not.toBeInTheDocument();
  fireEvent.click(backButton());
  expect(screen.getByRole('button', { name: 'Open CI run #42 in example/build' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Open CI run #41 in example/build' })).toBeVisible();
  expect(requestedActivity('job')).toHaveLength(detailReads);
  expect(requestedActivity('job-logs')).toHaveLength(0);
});

it('recovers from malformed saved filters without applying an unrelated Repository', async () => {
  saveNavigation({
    view: 'unexpected',
    scope: { organization: 'example', repository: 'unrelated/build' },
    runnerStatus: 'invalid',
    runStatus: 'invalid',
    device: 'invalid',
  });
  await ready(false);
  expect(viewButton('Runners')).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByText('All runners')).toBeVisible();
  expect(screen.getByText('All devices')).toBeVisible();
  expect(
    within(screen.getByRole('region', { name: 'Activity scope' })).queryByText('unrelated/build'),
  ).not.toBeInTheDocument();
  expect(savedNavigation()).toMatchObject({
    scope: { organization: 'example', repository: '' },
    runStatus: 'all',
  });
});

it('loads only assigned work summaries until opening a Run and selecting a Job', async () => {
  serveActivity();
  await ready(false);
  const row = within(screen.getByRole('row', { name: /build-mac-1/ }));
  expect(await row.findByText('Build application')).toBeVisible();
  expect(row.queryByText('Run tests')).not.toBeInTheDocument();
  expect(requestedActivity('job')).toHaveLength(0);
  expect(requestedActivity('run')).toHaveLength(0);

  const user = userEvent.setup();
  await user.click(screen.getByRole('row', { name: /build-mac-1/ }));
  await waitFor(() =>
    expect(
      requestedActivity('runs').some((url) => url.searchParams.get('runner_id') === '42'),
    ).toBe(true),
  );
  await openRun(user);
  await screen.findByRole('complementary', { name: 'Jobs in this run' });
  const localJob = jobsInRun().getByRole('treeitem', { name: /Build application/ });
  expect(within(localJob).getByText('Selected runner')).toBeVisible();
  expect(jobsInRun().getByRole('treeitem', { name: /Run tests/ })).toHaveAccessibleName(
    /GitHub-hosted.*Other device/,
  );
  expect(requestedActivity('job')).toHaveLength(0);
  const job = await openBuildJob(user);
  expect(job.getByText('2/2 steps completed')).toBeVisible();
  expect(requestedActivity('job')).toHaveLength(1);
  expect(requestedActivity('job-logs')).toHaveLength(0);
  await user.click(job.getByRole('button', { name: 'Full job log' }));
  expect(await job.findByText('Build finished')).toBeVisible();
  expect(requestedActivity('job-logs')).toHaveLength(1);
});

it('composes Org and Repo filters, prefills creation, and remembers the last Runs view', async () => {
  serveActivity();
  const view = mount();
  const user = userEvent.setup();
  await screen.findByRole('button', { name: 'Details for build-mac-1' });
  await screen.findByRole('button', { name: 'GitHub CLI · @octocat' });
  expect(requested((url) => url.startsWith('/api/github/targets'))).toBe(false);
  await user.click(screen.getByRole('combobox', { name: 'Filter organization' }));
  await user.click(await screen.findByRole('option', { name: /example.*Organization/ }));
  await user.click(screen.getByRole('combobox', { name: 'Filter repository' }));
  await user.click(await screen.findByRole('option', { name: /example\/build/ }));
  await waitFor(() =>
    expect(
      requestedActivity('work').some(
        (url) =>
          url.searchParams.get('organization') === 'example' &&
          url.searchParams.get('repository') === 'example/build',
      ),
    ).toBe(true),
  );
  await user.click(screen.getByRole('button', { name: 'Add runner' }));
  const dialog = within(screen.getByRole('dialog', { name: 'Add runner' }));
  await user.click(dialog.getByRole('button', { name: 'Continue to target' }));
  expect(dialog.getByText('example/build')).toBeVisible();
  expect(dialog.getByRole('button', { name: 'Create runner' })).toBeEnabled();
  await user.click(dialog.getByRole('button', { name: 'Cancel' }));

  await user.click(viewButton('Runs'));
  await user.type(screen.getByRole('searchbox', { name: 'Search runs' }), 'Build');
  await user.click(screen.getByRole('combobox', { name: 'Run status' }));
  await user.click(screen.getByRole('option', { name: 'Success' }));
  await waitFor(() =>
    expect(savedNavigation()).toMatchObject({
      view: 'runs',
      scope: { organization: 'example', repository: 'example/build' },
      runSearch: 'Build',
      runStatus: 'success',
    }),
  );
  view.unmount();
  mount();
  expect(await screen.findByRole('searchbox', { name: 'Search runs' })).toHaveValue('Build');
  expect(screen.getByText('Success', { selector: '[class$="singleValue"] span' })).toBeVisible();
  expect(viewButton('Runs')).toHaveAttribute('aria-pressed', 'true');
  const scope = within(screen.getByRole('region', { name: 'Activity scope' }));
  expect(scope.getByText('example')).toBeVisible();
  expect(scope.getByText('example/build')).toBeVisible();
});

it('supports view switching and management when browser storage is unavailable', async () => {
  const unavailable = () => {
    throw new Error('Storage unavailable');
  };
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(unavailable);
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(unavailable);
  await ready(false);
  await userEvent.click(viewButton('Runs'));
  expect(await screen.findByRole('heading', { name: /^Workflow runs/ })).toBeVisible();
  await userEvent.click(viewButton('Runners'));
  await openDetails();
  expect(screen.getByRole('button', { name: 'Stop' })).toBeEnabled();
});
