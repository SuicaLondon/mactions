import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { createQueryClient } from '../../../../shared/api/query-client';
import type { LoginAttempt } from '../../../../shared/api/types';
import { OrganizationAccessGrant } from './OrganizationAccessGrant';

const fetchMock = vi.fn<typeof fetch>();
let client: ReturnType<typeof createQueryClient>;
let attempt: LoginAttempt = { status: 'idle', code: null, url: '' };

beforeEach(() => {
  attempt = { status: 'idle', code: null, url: '' };
  client = createQueryClient();
  fetchMock.mockReset().mockImplementation(async (url, options) => {
    let data: unknown = { connected: true, login: 'octocat', message: 'Connected' };
    if (url === '/api/github/auth') {
      if (options?.method === 'POST')
        attempt = { status: 'pending', code: 'ABCD-1234', url: 'https://github.com/login/device' };
      data = attempt;
    }
    return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  client.clear();
  vi.unstubAllGlobals();
});

it('starts authorization and shows the device code with a GitHub link', async () => {
  const user = userEvent.setup();
  render(
    <QueryClientProvider client={client}>
      <OrganizationAccessGrant />
    </QueryClientProvider>,
  );
  await user.click(await screen.findByRole('button', { name: 'Grant organization access' }));
  expect(await screen.findByText('ABCD-1234')).toBeVisible();
  expect(screen.getByRole('link', { name: /Open GitHub/ })).toHaveAttribute(
    'href',
    'https://github.com/login/device',
  );
});
