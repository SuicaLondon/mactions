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
        'size-7 min-h-7 min-w-7 shrink-0 rounded-md border-0',
        // Phones and touch screens get a 40px hit area; the icon keeps its size.
        'max-md:size-10 max-md:min-h-10 max-md:min-w-10',
        'pointer-coarse:size-10 pointer-coarse:min-h-10 pointer-coarse:min-w-10',
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
