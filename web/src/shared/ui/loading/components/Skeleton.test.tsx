import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';

import { InlineLoading } from './InlineLoading';
import { LoadingSpinner } from './LoadingSpinner';
import { LogLinesSkeleton } from './LogLinesSkeleton';
import { Skeleton } from './Skeleton';
import { SkeletonLine } from './SkeletonLine';
import { SkeletonText } from './SkeletonText';

it('announces one loading status and hides its placeholder shapes', () => {
  const { container } = render(
    <Skeleton label="Loading runs…">
      <SkeletonText />
      <SkeletonLine />
      <LogLinesSkeleton lineNumbers />
    </Skeleton>,
  );
  expect(screen.getByRole('status', { name: 'Loading runs…' })).toHaveAttribute(
    'aria-busy',
    'true',
  );
  expect(container.textContent).toBe('');
  expect(container.querySelector('[role="status"] > [aria-hidden="true"]')).not.toBeNull();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});

it('draws a line-number gutter only when asked', () => {
  const { container, rerender } = render(<LogLinesSkeleton />);
  expect(container.querySelectorAll('.shrink-0')).toHaveLength(0);
  rerender(<LogLinesSkeleton lineNumbers />);
  expect(container.querySelectorAll('.shrink-0')).toHaveLength(8);
});

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
