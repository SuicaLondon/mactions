import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { createQueryClient } from '../../../../../shared/api/query-client';
import { makeJob } from '../../../../../test/activity-fixtures';
import { JobLogs } from './JobLogs';

const job = makeJob({ id: 900, name: 'Build application' });
const content = ['Compile target', 'warning: target skipped', 'all done', 'TARGET reached'].join(
  '\n',
);
const fetchMock = vi.fn<typeof fetch>();
let client: ReturnType<typeof createQueryClient>;

function serveContent(text: string) {
  fetchMock.mockImplementation(
    async () =>
      new Response(JSON.stringify({ state: 'available', content: text, message: '', steps: [] })),
  );
}

beforeEach(() => {
  client = createQueryClient();
  fetchMock.mockReset();
  serveContent(content);
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  client.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function renderLogs() {
  render(
    <QueryClientProvider client={client}>
      <JobLogs job={job} source={{ repository: 'example/app' }} />
    </QueryClientProvider>,
  );
}
async function mount() {
  renderLogs();
  await screen.findByLabelText('Full logs for Build application');
  return screen.getByRole('textbox', { name: 'Search log' });
}

function counter() {
  return screen.getByTestId('job-log-search-counter');
}

function activeLine() {
  const output = screen.getByLabelText('Full logs for Build application');
  return output
    .querySelector('mark[data-active]')
    ?.closest('[data-line]')
    ?.getAttribute('data-line');
}

it('keeps every search control mounted before and after a query', async () => {
  renderLogs();
  const input = screen.getByRole('textbox', { name: 'Search log' });
  expect(input).toBeDisabled();
  expect(counter()).toHaveTextContent('');
  expect(screen.getByRole('button', { name: 'Previous match' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Next match' })).toBeDisabled();
  await screen.findByLabelText('Full logs for Build application');
  expect(input).toBeEnabled();
  expect(input).toHaveAttribute('placeholder', 'Search log');
  expect(input).toHaveAccessibleDescription('Enter next · Shift+Enter previous · Esc clear');
  expect(counter()).toHaveTextContent('');
  const output = screen.getByLabelText('Full logs for Build application');
  expect(output.querySelector('mark')).toBeNull();
});

it('highlights matches and moves through them with Enter, wrapping at the end', async () => {
  const user = userEvent.setup();
  const input = await mount();
  await user.type(input, 'target');
  await waitFor(() => expect(counter()).toHaveTextContent('1 of 3'));
  const output = screen.getByLabelText('Full logs for Build application');
  const marks = output.querySelectorAll('mark');
  expect(Array.from(marks, (mark) => mark.textContent)).toEqual(['target', 'target', 'TARGET']);
  expect(activeLine()).toBe('1');
  expect(screen.getByRole('button', { name: 'Next match' })).toBeEnabled();

  await user.keyboard('{Enter}');
  expect(counter()).toHaveTextContent('2 of 3');
  expect(activeLine()).toBe('2');
  await user.keyboard('{Enter}');
  expect(counter()).toHaveTextContent('3 of 3');
  expect(activeLine()).toBe('4');
  await user.keyboard('{Enter}');
  expect(counter()).toHaveTextContent('1 of 3');
  await user.keyboard('{Shift>}{Enter}{/Shift}');
  expect(counter()).toHaveTextContent('3 of 3');
  await user.click(screen.getByRole('button', { name: 'Previous match' }));
  expect(counter()).toHaveTextContent('2 of 3');
});

it('reports no matches, disables match navigation, and clears the query with Escape', async () => {
  const user = userEvent.setup();
  const input = await mount();
  await user.type(input, 'missing');
  await waitFor(() => expect(counter()).toHaveTextContent('No matches'));
  expect(screen.getByRole('button', { name: 'Previous match' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Next match' })).toBeDisabled();
  await user.clear(input);
  await user.type(input, 'done');
  await waitFor(() => expect(counter()).toHaveTextContent('1 of 1'));
  await user.keyboard('{Escape}');
  expect(input).toHaveValue('');
  expect(counter()).toHaveTextContent('');
  expect(screen.getByLabelText('Full logs for Build application').querySelector('mark')).toBeNull();
});

it('shows a short UTC time in the gutter and downloads the original text', async () => {
  const timed = '2026-10-13T22:13:49.2989160Z Compile target\nno timestamp';
  serveContent(timed);
  let saved: Blob | undefined;
  Object.assign(URL, {
    createObjectURL: (blob: Blob) => {
      saved = blob;
      return 'blob:log';
    },
    revokeObjectURL: vi.fn(),
  });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  const user = userEvent.setup();
  const input = await mount();
  const output = screen.getByLabelText('Full logs for Build application');
  const [first, second] = output.querySelectorAll('[data-number]');
  expect(first).toHaveAttribute('data-number', '1');
  expect(first).toHaveAttribute('data-time', '22:13:49');
  expect(first).toHaveAttribute('title', '2026-10-13T22:13:49.2989160Z');
  expect(second).toHaveAttribute('data-time', '');
  expect(second).not.toHaveAttribute('title');
  expect(output.textContent).toBe('Compile target\nno timestamp');

  await user.type(input, 'target');
  await waitFor(() => expect(counter()).toHaveTextContent('1 of 1'));
  await user.click(screen.getByRole('button', { name: 'Download' }));
  expect(await saved?.text()).toBe(timed);
});

function stubViewport(phone: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({ matches: phone, media: query })),
  );
}

it.each([
  { phone: true, wrapped: true },
  { phone: false, wrapped: false },
])(
  'wraps lines by default only on phones (phone: $phone) and keeps the viewer choice',
  async ({ phone, wrapped }) => {
    stubViewport(phone);
    const user = userEvent.setup();
    await mount();
    const output = screen.getByLabelText('Full logs for Build application');
    // Phones keep Wrap lines in the closed "More log actions" menu.
    const wrap = screen.getByRole('checkbox', { name: 'Wrap lines', hidden: true });
    expect(wrap).toHaveProperty('checked', wrapped);
    expect(output.hasAttribute('data-wrapped')).toBe(wrapped);
    await user.click(wrap);
    expect(output.hasAttribute('data-wrapped')).toBe(!wrapped);
  },
);

it('moves the log actions into a More menu on phones, leaving the refresh status outside', async () => {
  stubViewport(true);
  await mount();
  const more = screen.getByRole('button', { name: 'More log actions' });
  const menu = document.getElementById(more.getAttribute('popovertarget') ?? '')!;
  expect(menu).toHaveAttribute('popover', 'auto');
  const actions = within(menu);
  expect(actions.getByRole('checkbox', { name: 'Wrap lines', hidden: true })).toBeInTheDocument();
  expect(actions.getByRole('button', { name: 'Download', hidden: true })).toBeInTheDocument();
  expect(actions.getByRole('button', { name: /^Refresh /, hidden: true })).toBeInTheDocument();
  expect(actions.getByRole('link', { name: 'GitHub', hidden: true })).toBeInTheDocument();
  expect(menu).not.toContainElement(screen.getByRole('status', { hidden: true }));
});

it('shows the log actions inline without a More menu on wider viewports', async () => {
  stubViewport(false);
  await mount();
  expect(screen.queryByRole('button', { name: 'More log actions' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Download' }).closest('[popover]')).toBeNull();
  expect(screen.getByRole('checkbox', { name: 'Wrap lines' })).toBeVisible();
});

it('starts a new search at the first match in view instead of the top of the log', async () => {
  // Line N ends at N * 20 - 30px, so line 2 is the first line below the output's top edge.
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    const line = Number(this.getAttribute('data-line'));
    if (!line) return new DOMRect(0, 0, 300, 400);
    return new DOMRect(0, line * 20 - 50, 300, 20);
  });
  const user = userEvent.setup();
  const input = await mount();
  await user.type(input, 'target');
  await waitFor(() => expect(counter()).toHaveTextContent('2 of 3'));
  expect(activeLine()).toBe('2');
  await user.keyboard('{Enter}');
  expect(activeLine()).toBe('4');
});
