import type { ButtonHTMLAttributes } from 'react';

import { cn } from '../../../lib/cn';
import { RefreshIcon } from '../../icons/actions/RefreshIcon';
import { IconButton } from './IconButton';

interface RefreshButtonProps {
  label: string;
  iconOnly?: boolean;
  className?: string;
  iconClassName?: string;
  disabled?: boolean;
  onClick: ButtonHTMLAttributes<HTMLButtonElement>['onClick'];
}

export function RefreshButton({
  label,
  iconOnly = false,
  className,
  iconClassName,
  disabled,
  onClick,
}: RefreshButtonProps) {
  if (iconOnly) {
    return (
      <IconButton
        icon={RefreshIcon}
        label={label}
        className={className}
        iconClassName={iconClassName}
        disabled={disabled}
        onClick={onClick}
      />
    );
  }

  return (
    <button
      type="button"
      className={cn('min-h-7 text-xs', className)}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      <RefreshIcon className={cn('h-3.5 w-3.5', iconClassName)} />
      Refresh
    </button>
  );
}
