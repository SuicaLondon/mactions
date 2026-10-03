import type { ReactNode } from 'react';

import { cn } from '../../../shared/lib/cn';

export function PageEmptyState({
  title,
  message,
  icon,
  action,
}: {
  title: string;
  message?: string;
  icon?: ReactNode;
  action: ReactNode;
}) {
  return (
    <div
      className={cn(
        'empty mx-0 mb-4.5 flex min-h-77.5 flex-1 flex-col',
        'items-center justify-center px-6 py-10 text-center max-md:min-h-61.25',
      )}
    >
      {icon}
      <h2 className="m-0 text-base font-semibold tracking-tight">{title}</h2>
      {!!message && <p className="mt-2 max-w-67.5 text-xs leading-relaxed text-muted">{message}</p>}
      {action}
    </div>
  );
}
