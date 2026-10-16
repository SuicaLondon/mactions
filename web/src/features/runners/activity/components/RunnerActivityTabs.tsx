import { cn } from '../../../../shared/lib/cn';
import type { RunnerActivityTab } from '../models/runner-activity';

const tabs = [
  { value: 'jobs', label: 'Jobs' },
  { value: 'logs', label: 'Logs' },
] as const;

interface RunnerActivityTabsProps {
  tab: RunnerActivityTab;
  onTabChange: (tab: RunnerActivityTab) => void;
}

export function RunnerActivityTabs({ tab, onTabChange }: RunnerActivityTabsProps) {
  return (
    <div
      className={cn(
        // The same track as the Runners/Runs switch in the header.
        'inline-flex shrink-0 gap-0.5 rounded-lg bg-muted/10 p-0.5 max-md:w-full',
      )}
      role="group"
      aria-label="Runner activity view"
    >
      {tabs.map(({ value, label }) => (
        <button
          key={value}
          aria-pressed={tab === value}
          onClick={() => onTabChange(value)}
          className={cn(
            'min-h-7 rounded-md border-0 bg-transparent px-3 py-0 text-xs font-medium',
            'text-muted shadow-none hover:bg-muted/10 hover:text-foreground max-md:flex-1',
            'aria-pressed:bg-control aria-pressed:text-foreground aria-pressed:shadow-xs',
            'aria-pressed:ring-1 aria-pressed:ring-control-border',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
