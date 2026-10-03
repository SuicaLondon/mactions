import { cn } from '../../../../../shared/lib/cn';
import type { DisplayRunner } from '../../models/runner-list';

export function RunnerRowLabels({ row }: { row: DisplayRunner }) {
  if (row.labels.length)
    return (
      <>
        <div
          className={cn(
            'runner-label-list flex max-h-9.5 min-w-0 flex-wrap items-center gap-0.75',
            'overflow-hidden',
          )}
        >
          {row.labels.slice(0, 3).map((label) => (
            <span
              className={cn(
                'runner-label max-w-27.5 min-w-0 overflow-hidden rounded-xs bg-muted/5 px-1.25',
                'py-0.25 text-xs leading-4 text-ellipsis whitespace-nowrap text-muted',
              )}
              key={label}
            >
              {label}
            </span>
          ))}
        </div>
        {!!(row.labels.length > 3) && (
          <span
            className="runner-label-overflow shrink-0 text-xs text-muted"
            aria-label={`${row.labels.length - 3} more labels`}
          >
            +{row.labels.length - 3}
          </span>
        )}
      </>
    );
  return <span className="runner-no-labels shrink-0 text-xs text-muted">—</span>;
}
