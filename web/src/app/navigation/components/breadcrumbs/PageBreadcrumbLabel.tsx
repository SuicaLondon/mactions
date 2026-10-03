import { cn } from '../../../../shared/lib/cn';

export function PageBreadcrumbLabel({
  onNavigate,
  label,
}: {
  onNavigate?: () => void;
  label: string;
}) {
  if (onNavigate) {
    return (
      <button
        className={cn(
          'breadcrumb-link min-h-7 max-w-52.5 justify-start overflow-hidden border-0',
          'bg-transparent px-1.5 py-0.75 text-xs text-ellipsis text-muted shadow-none',
          'hover:bg-muted/10 hover:text-foreground',
        )}
        onClick={onNavigate}
      >
        {label}
      </button>
    );
  }
  return (
    <span
      aria-current="page"
      className={cn(
        'max-w-52.5 overflow-hidden py-1 font-medium text-ellipsis text-foreground',
        'whitespace-nowrap',
      )}
    >
      {label}
    </span>
  );
}
