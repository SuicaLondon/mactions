import type { ReactNode } from 'react';

import { cn } from '../../../../../shared/lib/cn';

export function CreationNotice({ children }: { children: ReactNode }) {
  return (
    <div
      className={cn(
        'loading-notice mx-0 my-3 mb-0 flex items-center gap-2.5 rounded-lg bg-accent/10',
        'p-3 text-xs leading-normal text-foreground',
      )}
      role="status"
    >
      <span
        className={cn(
          'loading-spinner inline-block size-3.5 shrink-0 animate-spin rounded-full',
          'border-2 border-current border-r-transparent motion-reduce:animate-none',
        )}
        aria-hidden="true"
      />
      {children}
    </div>
  );
}
