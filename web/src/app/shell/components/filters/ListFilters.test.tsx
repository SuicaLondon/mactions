import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';

import { mount, setupAppTests } from '../../../../test/app-harness';

setupAppTests();

it('keeps every runner filter in the toolbar instead of behind a Filters button', async () => {
  mount();
  const filters = within(await screen.findByRole('region', { name: 'Runner filters' }));
  expect(filters.getByRole('searchbox', { name: 'Search runners' })).toBeVisible();
  expect(filters.getByRole('combobox', { name: 'Runner status' })).toBeInTheDocument();
  expect(filters.getByRole('combobox', { name: 'Runner device' })).toBeInTheDocument();
  expect(filters.queryByRole('button', { name: /Filters/ })).not.toBeInTheDocument();
});

it('shows the run status filter, without the device, on the Runs list', async () => {
  mount();
  await screen.findByRole('region', { name: 'Runner filters' });
  await userEvent.setup().keyboard('2');
  const filters = within(await screen.findByRole('region', { name: 'Run filters' }));
  expect(filters.getByRole('combobox', { name: 'Run status' })).toBeInTheDocument();
  expect(filters.queryByRole('combobox', { name: 'Runner device' })).not.toBeInTheDocument();
});
