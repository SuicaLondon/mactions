import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';

import type { Runner } from '../../../shared/api/types';
import {
  fetchMock,
  ready as mountApp,
  response,
  runner,
  serve,
  setupAppTests,
  snapshot,
} from '../../../test/app-harness';

setupAppTests();

async function ready() {
  await mountApp(false);
  return userEvent.setup();
}

it('switches views with 1 and 2, focuses search with /, and refreshes with r', async () => {
  const user = await ready();
  await user.keyboard('2');
  expect(await screen.findByRole('searchbox', { name: 'Search runs' })).toBeInTheDocument();
  await user.keyboard('1/');
  expect(await screen.findByRole('searchbox', { name: 'Search runners' })).toHaveFocus();
  screen.getByRole('searchbox', { name: 'Search runners' }).blur();
  const calls = fetchMock.mock.calls.length;
  await user.keyboard('r');
  await vi.waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(calls));
});

it('ignores shortcuts while typing in a field or with a command modifier held', async () => {
  const user = await ready();
  await user.keyboard('{Meta>}2{/Meta}');
  const search = screen.getByRole('searchbox', { name: 'Search runners' });
  await user.click(search);
  await user.keyboard('2nj?');
  expect(search).toHaveFocus();
  expect(search).toHaveValue('2nj?');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.queryByRole('searchbox', { name: 'Search runs' })).not.toBeInTheDocument();
});

it('opens the shortcut list with ? and from the header button', async () => {
  const user = await ready();
  await user.keyboard('?');
  const dialog = within(screen.getByRole('dialog', { name: 'Keyboard shortcuts' }));
  const keysIn = (section: string) =>
    within(dialog.getByRole('rowgroup', { name: section }))
      .getAllByRole('row')
      .map((row) => row.querySelector('kbd')?.textContent);
  expect(keysIn('Anywhere')).toEqual([
    undefined,
    '/',
    '1',
    '2',
    'r',
    'n',
    'j / k',
    'Enter',
    '?',
    'Esc',
  ]);
  expect(keysIn('Log search')).toEqual([undefined, 'Enter', 'Shift+Enter', 'Esc']);
  expect(dialog.getByText('Open the focused row')).toBeInTheDocument();
  // Other shortcuts do not stack a second dialog.
  await user.keyboard('n');
  expect(screen.getAllByRole('dialog')).toHaveLength(1);
  await user.click(dialog.getByRole('button', { name: 'Done' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Keyboard shortcuts' }));
  expect(screen.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeInTheDocument();
});

it('treats Shift+/ reported as / as the shortcut list key', async () => {
  const user = await ready();
  await user.keyboard('{Shift>}/{/Shift}');
  expect(screen.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeInTheDocument();
});

it('opens Add runner with n', async () => {
  const user = await ready();
  await user.keyboard('n');
  expect(
    within(screen.getByRole('dialog')).getByRole('button', { name: 'Continue to target' }),
  ).toBeInTheDocument();
});

it('moves row focus with j and k, keeps open details in step, and opens a row with Enter', async () => {
  const second: Runner = {
    ...runner,
    id: 2,
    name: 'build-mac-2',
    path: '/managed/actions-runner-2',
  };
  serve((path) => {
    if (path.startsWith('/api/runners'))
      return response({ ...snapshot, runners: [runner, second] });
  });
  const user = await ready();
  const firstRow = screen.getByRole('row', { name: /^build-mac-1,/ });
  const secondRow = await screen.findByRole('row', { name: /^build-mac-2,/ });
  // A closed panel stays closed while focus moves between rows.
  await user.keyboard('j');
  expect(firstRow).toHaveFocus();
  expect(screen.queryByRole('complementary', { name: 'Runner details' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Details for build-mac-1' }));
  const panel = screen.getByRole('complementary', { name: 'Runner details' });
  expect(within(panel).getByRole('button', { name: 'Close runner details' })).toHaveFocus();
  expect(firstRow).toHaveAttribute('aria-selected', 'true');
  // From the panel, j steps from the selected row; the panel follows without taking focus.
  // The last row stays focused instead of wrapping.
  await user.keyboard('jj');
  expect(secondRow).toHaveFocus();
  expect(secondRow).toHaveAttribute('aria-selected', 'true');
  expect(within(panel).getAllByText('build-mac-2').length).toBeGreaterThan(0);
  await user.keyboard('{ArrowUp}');
  expect(firstRow).toHaveFocus();
  expect(firstRow).toHaveAttribute('aria-selected', 'true');
  // Closing returns focus to the row the panel last followed.
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('complementary', { name: 'Runner details' })).not.toBeInTheDocument();
  expect(firstRow).toHaveFocus();
  await user.keyboard('{Enter}');
  expect(await screen.findByRole('searchbox', { name: 'Search runs' })).toBeInTheDocument();
});
