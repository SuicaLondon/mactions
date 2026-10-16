import type { ReactNode } from 'react';

import { cn } from '../../../lib/cn';
import { LoadingSpinner } from '../../loading/components/LoadingSpinner';

/**
 * Stacks the idle and pending labels in one grid cell so a button keeps the
 * width of the wider label when it switches between them.
 */
export function PendingLabel({
  pending,
  idle,
  busy,
}: {
  pending: boolean;
  idle: ReactNode;
  busy: ReactNode;
}) {
  return (
    <span className="inline-grid items-center justify-items-center">
      <span
        className={cn('col-start-1 row-start-1', { invisible: pending })}
        aria-hidden={pending || undefined}
      >
        {idle}
      </span>
      <span
        className={cn('col-start-1 row-start-1 inline-flex items-center gap-1.5', {
          invisible: !pending,
        })}
        aria-hidden={!pending || undefined}
      >
        <span className="inline-flex" aria-hidden="true">
          <LoadingSpinner />
        </span>
        {busy}
      </span>
    </span>
  );
}
