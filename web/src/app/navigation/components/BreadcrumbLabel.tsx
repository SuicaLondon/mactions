import { cn } from '../../../shared/lib/cn';

/** A link back to an earlier crumb, or the plain label of the current or a passed-over crumb. */
export function BreadcrumbLabel({
  label,
  current,
  onNavigate,
}: {
  label: string;
  /** The last crumb: the page or selection being shown. */
  current: boolean;
  onNavigate?: () => void;
}) {
  if (onNavigate) {
    return (
      <button
        type="button"
        className={cn(
          'min-h-7 max-w-52.5 min-w-0 justify-start overflow-hidden',
          'border-0',
          'bg-transparent px-1.5 py-0.75 text-xs text-muted shadow-none max-md:min-h-10',
          'pointer-coarse:min-h-10',
          'hover:bg-muted/10 hover:text-foreground',
        )}
        onClick={onNavigate}
      >
        <span className="truncate">{label}</span>
      </button>
    );
  }
  let ariaCurrent: 'page' | undefined;
  if (current) ariaCurrent = 'page';
  return (
    <span
      aria-current={ariaCurrent}
      className={cn('max-w-52.5 min-w-0 truncate py-1', {
        'font-medium text-foreground': current,
        'text-muted': !current,
      })}
    >
      {label}
    </span>
  );
}
