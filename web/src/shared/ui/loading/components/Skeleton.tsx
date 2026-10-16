import type { ReactNode } from 'react';

import { cn } from '../../../lib/cn';

/**
 * A loading region: one announced status whose placeholder shapes are hidden from assistive
 * technology. The shapes pulse unless the user prefers reduced motion.
 */
export function Skeleton({
  label,
  className,
  children,
}: {
  label: string;
  /** Sizes the region, such as `min-h-0 flex-1` to fill a flex column. */
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      role="status"
      aria-label={label}
      aria-busy="true"
      className={cn('flex w-full min-w-0 flex-col', className)}
    >
      <div
        aria-hidden="true"
        className={cn(
          'flex min-h-0 min-w-0 flex-1 flex-col',
          'animate-pulse motion-reduce:animate-none',
        )}
      >
        {children}
      </div>
    </div>
  );
}
