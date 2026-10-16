import type { ReactNode } from 'react';

import { cn } from '../../../../../shared/lib/cn';
import type { IconComponent } from '../../../../../shared/ui/icons/types';
import type { RunnerActivityLayout } from '../../models/runner-activity';

const toggleClasses: Record<RunnerActivityLayout, string> = {
  panel: '',
  page: cn(
    'h-7.5 min-h-7.5 rounded-sm border border-control-border bg-surface py-1',
    'whitespace-nowrap text-muted shadow-none aria-pressed:border-accent/40',
    'aria-pressed:bg-accent/10 aria-pressed:text-foreground',
  ),
};

const toggleIconClasses: Record<RunnerActivityLayout, string> = {
  panel: '',
  page: 'size-3.25',
};

interface LogToggleProps {
  layout: RunnerActivityLayout;
  /** The accessible name, which can say what pressing does. */
  label: string;
  pressed: boolean;
  icon: IconComponent;
  iconClassName?: string;
  className?: string;
  onToggle: () => void;
  children: ReactNode;
}

/** A pressed-state button for one log view option, such as following the output. */
export function LogToggle({
  layout,
  label,
  pressed,
  icon: Icon,
  iconClassName,
  className,
  onToggle,
  children,
}: LogToggleProps) {
  return (
    <button
      className={cn('text-xs', toggleClasses[layout], className)}
      aria-label={label}
      aria-pressed={pressed}
      onClick={onToggle}
    >
      <Icon className={cn(iconClassName, toggleIconClasses[layout])} />
      {children}
    </button>
  );
}
