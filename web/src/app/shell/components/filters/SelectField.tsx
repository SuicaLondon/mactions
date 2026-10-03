import type { ReactNode } from 'react';

import { cn } from '../../../../shared/lib/cn';

export function SelectField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      data-select-anchor
      className={cn(
        'list-select-field flex h-8 min-w-36 flex-initial items-center gap-0.75',
        'rounded-md border border-control-border bg-canvas pl-2.25',
        'focus-within:border-accent focus-within:ring-2 focus-within:ring-focus',
        '@max-xl/activity-main:flex-1',
      )}
    >
      <span className="shrink-0 text-xs text-muted">{label}</span>
      {children}
    </div>
  );
}
