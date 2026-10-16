import { cn } from '../../../../../shared/lib/cn';

/** Characters kept after the ellipsis; runner names usually differ only in their suffix. */
const TAIL_LENGTH = 6;

/** Truncates a runner name in the middle so its distinguishing suffix stays visible. */
export function HistoryRunnerName({
  name,
  title = name,
  className,
}: {
  name: string;
  title?: string;
  className?: string;
}) {
  if (name.length <= TAIL_LENGTH * 2) {
    return (
      <span className={cn('flex min-w-0', className)} title={title}>
        <span className="min-w-0 truncate">{name}</span>
      </span>
    );
  }
  return (
    <span className={cn('flex min-w-0', className)} title={title}>
      <span className="sr-only">{name}</span>
      <span aria-hidden="true" className="min-w-0 truncate">
        {name.slice(0, -TAIL_LENGTH)}
      </span>
      <span aria-hidden="true" className="shrink-0 whitespace-pre">
        {name.slice(-TAIL_LENGTH)}
      </span>
    </span>
  );
}
