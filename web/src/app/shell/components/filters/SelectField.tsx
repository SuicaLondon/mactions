import { type ReactNode } from 'react';

import { cn } from '../../../../shared/lib/cn';

/** A labeled toolbar field around a borderless select, with a fixed width set by `className`. */
export function SelectField({
  label,
  className,
  children,
}: {
  label: string;
  className: string;
  children: ReactNode;
}) {
  return (
    <div
      data-select-anchor
      className={cn(
        'flex h-8 min-w-36 flex-initial items-center gap-0.75',
        'max-md:h-auto pointer-coarse:h-auto',
        'rounded-md border border-control-border bg-canvas pl-2.25',
        'focus-within:border-accent focus-within:ring-2 focus-within:ring-focus',
        '@max-xl/activity-main:flex-1',
        className,
      )}
    >
      <span className="shrink-0 text-xs text-muted">{label}</span>
      {children}
    </div>
  );
}
