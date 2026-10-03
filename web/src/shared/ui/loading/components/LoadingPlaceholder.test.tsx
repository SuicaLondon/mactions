import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';

import { InlineLoading } from './InlineLoading';
import { LoadingPlaceholder } from './LoadingPlaceholder';
import { LoadingSpinner } from './LoadingSpinner';

it.each([
  'runners',
  'runs',
  'run',
  'job',
  'step',
  'history',
  'history-steps',
  'logs',
  'runner-logs',
  'graph',
  'access',
  'steps',
  'toolbar',
] as const)(
  'announces %s loading without visible placeholder text or interactive controls',
  (kind) => {
    const { container } = render(<LoadingPlaceholder kind={kind} />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status')).toHaveAccessibleName();
    expect(container.textContent).toBe('');
    expect(container.querySelectorAll('.skeleton-line').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  },
);

it('keeps inline loading and spinners non-textual and accessible', () => {
  const { container } = render(
    <>
      <InlineLoading label="Checking account" />
      <LoadingSpinner label="Fetching next page" />
    </>,
  );
  expect(screen.getByRole('status', { name: 'Checking account' })).toHaveAttribute(
    'aria-busy',
    'true',
  );
  expect(screen.getByRole('status', { name: 'Fetching next page' })).toHaveAttribute(
    'aria-busy',
    'true',
  );
  expect(container.textContent).toBe('');
});
