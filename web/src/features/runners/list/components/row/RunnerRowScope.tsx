import type { Runner } from '../../../../../shared/api/types';
import { cn } from '../../../../../shared/lib/cn';
interface RunnerRowScopeProps {
  target: Runner['target'] | undefined;
  scopeLabel: string;
}
export function RunnerRowScope({ target, scopeLabel }: RunnerRowScopeProps) {
  return (
    <div
      className={cn(
        cn(
          'runner-grid-scope flex flex-col gap-0.5 @max-3xl:col-start-2',
          '@max-3xl:col-end-auto @max-3xl:row-start-1 @max-3xl:row-end-auto',
          '@max-md:col-start-1 @max-md:col-end-auto @max-md:row-start-2',
          '@max-md:row-end-auto @max-md:pl-8',
        ),
        'min-w-0',
      )}
      role="gridcell"
    >
      <span
        className={cn(
          'runner-target overflow-hidden text-xs leading-4.5 text-ellipsis',
          'whitespace-nowrap text-foreground',
        )}
        title={target?.name}
      >
        {target?.name ?? '—'}
      </span>
      {!!target && (
        <span
          className={cn(
            'runner-scope-kind overflow-hidden text-xs leading-4 text-ellipsis',
            'whitespace-nowrap text-muted @max-3xl:hidden',
          )}
        >
          {scopeLabel}
        </span>
      )}
    </div>
  );
}
