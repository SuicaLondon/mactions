import { cn } from '../../../lib/cn';
import type { LoadingKind } from '../models/loading';
import { labels } from '../models/loading';
import { placeholderClasses } from '../models/loading';
import { PlaceholderContent } from './placeholders/common/PlaceholderContent';

export function LoadingPlaceholder({
  kind,
  label = labels[kind],
  className = '',
  view = 'runners',
}: {
  kind: LoadingKind;
  view?: 'runners' | 'runs';
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-label={label}
      aria-busy="true"
      className={cn(
        'loading-placeholder',
        placeholderClasses[kind],
        'w-full min-w-0',
        {
          'flex min-h-0 flex-1 flex-col': kind === 'run' || kind === 'step',
          'h-full': kind === 'step',
        },
        className,
      )}
    >
      <div
        aria-hidden="true"
        className={cn('min-w-0 animate-pulse motion-reduce:animate-none', {
          'flex min-h-0 flex-1 flex-col': kind === 'run' || kind === 'step',
          'h-full': kind === 'step',
        })}
      >
        <PlaceholderContent kind={kind} view={view} />
      </div>
    </div>
  );
}
