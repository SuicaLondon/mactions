import { stateFor } from '../../../../shared/lib/activity-format';
import { cn } from '../../../../shared/lib/cn';
import { StatusIcon } from '../../../../shared/ui/icons/status/StatusIcon';

const toneClasses: Record<string, string> = {
  neutral: 'text-muted bg-muted/10',
  success: 'text-activity-success bg-activity-success/10',
  failure: 'text-activity-failure bg-activity-failure/10',
  running: 'text-activity-running bg-activity-running/10',
  queued: 'text-activity-running bg-activity-running/10',
};

export function Status({
  status,
  conclusion,
  compact = false,
  className,
}: {
  status: string;
  conclusion: string | null;
  compact?: boolean;
  className?: string;
}) {
  const state = stateFor(status, conclusion);
  return (
    <span
      className={cn(
        'activity-status inline-flex items-center gap-1.25 rounded-md px-1.75 py-0.75',
        'text-xs font-medium whitespace-nowrap',
        { 'gap-1 px-1.25': compact },
        toneClasses[state.tone],
        state.tone,
        className,
      )}
    >
      <StatusIcon name={state.icon} className={cn('size-3.5', { 'size-3.25': compact })} />
      {state.label}
    </span>
  );
}
