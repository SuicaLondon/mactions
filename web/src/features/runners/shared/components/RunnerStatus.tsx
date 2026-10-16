import { cn } from '../../../../shared/lib/cn';

export function RunnerStatus({
  label,
  title,
  state,
  className,
}: {
  label: string;
  title?: string;
  state: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        // Long labels such as "Needs attention" wrap to a second line in narrow columns instead of
        // truncating, so the state always reads in full.
        'inline-flex max-w-full items-start gap-1.75 text-xs/snug',
        'text-muted',
        {
          'text-activity-running': state === 'busy' || state === 'working',
          'text-activity-failure': state === 'error',
          'text-activity-success': state === 'online',
        },
        className,
      )}
      title={title}
    >
      <span className="mt-1 size-2 shrink-0 rounded-full bg-current" aria-hidden="true" />
      <span className="line-clamp-2 min-w-0">{label}</span>
    </span>
  );
}
