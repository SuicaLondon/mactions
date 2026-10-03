import { cn } from '../../../../shared/lib/cn';
import type { Page } from '../../models/app-navigation';

export function JobBreadcrumbLabel({
  item,
  current,
  onSelectJob,
}: {
  item: Extract<Page, { type: 'run' }>;
  current: boolean;
  onSelectJob: () => void;
}) {
  if (current && item.selectedStepNumber !== undefined) {
    return (
      <button
        className={cn(
          'breadcrumb-link min-h-7 max-w-52.5 justify-start overflow-hidden border-0',
          'bg-transparent px-1.5 py-0.75 text-xs text-ellipsis text-muted shadow-none',
          'hover:bg-muted/10 hover:text-foreground',
        )}
        onClick={onSelectJob}
      >
        {item.selectedJobName}
      </button>
    );
  }
  return (
    <span
      className={cn('max-w-52.5 overflow-hidden py-1 text-ellipsis whitespace-nowrap text-muted', {
        'current-crumb font-medium text-foreground': current,
      })}
    >
      {item.selectedJobName}
    </span>
  );
}
