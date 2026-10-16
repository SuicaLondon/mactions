import type { ReactNode } from 'react';

import { cn } from '../../../shared/lib/cn';
import type { IconComponent } from '../../../shared/ui/icons/types';

const iconToneClasses = { muted: 'text-muted', danger: 'text-danger' };

export function PageEmptyState({
  title,
  message,
  icon: Icon,
  tone = 'muted',
  action,
}: {
  title: string;
  message?: string;
  icon?: IconComponent;
  /** `danger` marks a failure, such as a connection check that could not run. */
  tone?: keyof typeof iconToneClasses;
  action: ReactNode;
}) {
  return (
    <div
      className={cn(
        'mx-0 mb-4.5 flex min-h-77.5 flex-1 flex-col',
        'items-center justify-center px-6 py-10 text-center max-md:min-h-61.25',
      )}
    >
      {!!Icon && <Icon className={cn('mb-4.5 size-11.5 stroke-2', iconToneClasses[tone])} />}
      <h2 className="m-0 text-base font-semibold tracking-tight">{title}</h2>
      {!!message && <p className="mt-2 max-w-67.5 text-xs/relaxed text-muted">{message}</p>}
      {action}
    </div>
  );
}
