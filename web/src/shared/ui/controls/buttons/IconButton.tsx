import type { ComponentPropsWithRef } from 'react';

import { cn } from '../../../lib/cn';
import type { IconComponent } from '../../icons/types';

type IconButtonProps = Omit<ComponentPropsWithRef<'button'>, 'children' | 'aria-label'> & {
  icon: IconComponent;
  label: string;
  iconClassName?: string;
};

export function IconButton({
  icon: Icon,
  label,
  className,
  iconClassName,
  title = label,
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <button
      {...props}
      type={type}
      aria-label={label}
      title={title}
      className={cn(
        'icon-button size-7 min-h-7 min-w-7 shrink-0 rounded-md border-0',
        'bg-transparent p-0 text-muted shadow-none transition-colors duration-150',
        'enabled:hover:bg-accent/10 enabled:hover:text-accent enabled:hover:filter-none',
        'enabled:active:translate-y-0 enabled:active:bg-accent/15',
        'focus-visible:outline-2 focus-visible:outline-offset-2',
        'focus-visible:outline-focus',
        'motion-reduce:transition-none',
        className,
      )}
    >
      <Icon className={cn('size-4', iconClassName)} />
    </button>
  );
}
