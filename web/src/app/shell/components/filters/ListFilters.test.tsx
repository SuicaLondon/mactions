import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it } from 'vitest';

import { mount, setupAppTests } from '../../../../test/app-harness';
import { useListFiltersStore } from '../../stores/list-filters-store';

setupAppTests();
beforeEach(() => useListFiltersStore.setState({ open: false }));

async function ready() {
  mount();
  return within(await screen.findByRole('region', { name: 'Runner filters' }));
}

it('toggles the phone filter panel and counts active filters but not the search', async () => {
  const user = userEvent.setup();
  const filters = await ready();
  const toggle = filters.getByRole('button', { name: 'Filters' });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  const panel = document.getElementById(toggle.getAttribute('aria-controls') ?? '');
  expect(panel).toContainElement(filters.getByRole('combobox', { name: 'Runner status' }));
  await user.click(toggle);
  expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await user.type(filters.getByRole('searchbox', { name: 'Search runners' }), 'mac');
  expect(toggle).toHaveAccessibleName('Filters');
  await user.click(filters.getByRole('combobox', { name: 'Runner status' }));
  await user.click(await screen.findByRole('option', { name: 'Active' }));
  expect(toggle).toHaveAccessibleName('Filters, 1 active');
});

it('remembers the open panel for the rest of the session', async () => {
  const user = userEvent.setup();
  const filters = await ready();
  await user.click(filters.getByRole('button', { name: 'Filters' }));
  await user.keyboard('2');
  const runFilters = within(await screen.findByRole('region', { name: 'Run filters' }));
  expect(runFilters.getByRole('button', { name: 'Filters' })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
});
