import { cn } from '../../../../shared/lib/cn';

export function RunnerStatus({
  label,
  state,
  className,
}: {
  label: string;
  state: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'status inline-flex items-center gap-1.75 text-xs leading-snug text-muted',
        {
          'text-activity-running': state === 'busy' || state === 'working',
          'text-activity-failure': state === 'error',
          'text-activity-success': state === 'online',
        },
        className,
      )}
    >
      <span className="size-2 shrink-0 rounded-full bg-current" aria-hidden="true" />
      {label}
    </span>
  );
}
