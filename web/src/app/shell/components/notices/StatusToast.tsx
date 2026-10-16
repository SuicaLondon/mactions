import type { ReactNode } from 'react';

import { cn } from '../../../../shared/lib/cn';
import { IconButton } from '../../../../shared/ui/controls/buttons/IconButton';
import { CloseIcon } from '../../../../shared/ui/icons/CloseIcon';

export function StatusToast({
  tone,
  icon,
  label,
  children,
  onDismiss,
}: {
  tone: 'neutral' | 'error';
  icon: ReactNode;
  label: string;
  children: ReactNode;
  onDismiss?: () => void;
}) {
  let role = 'status';
  if (tone === 'error') role = 'alert';
  return (
    <div
      role={role}
      aria-label={label}
      className={cn(
        'pointer-events-auto flex items-start gap-2 rounded-lg border bg-surface',
        'py-2 pr-1.5 pl-3 text-xs/normal text-foreground shadow-lg',
        {
          'border-danger/20': tone === 'error',
          'border-line': tone === 'neutral',
        },
      )}
    >
      <span className="flex h-7 shrink-0 items-center" aria-hidden="true">
        {icon}
      </span>
      <div className="max-h-32 min-h-12 min-w-0 flex-1 overflow-auto py-1.5 wrap-anywhere">
        {children}
      </div>
      {!!onDismiss && (
        <IconButton icon={CloseIcon} label="Dismiss" iconClassName="size-3.5" onClick={onDismiss} />
      )}
    </div>
  );
}
