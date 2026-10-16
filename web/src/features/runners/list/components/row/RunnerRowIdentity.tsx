import { cn } from '../../../../../shared/lib/cn';
import { ServerIcon } from '../../../../../shared/ui/icons/ServerIcon';

interface RunnerRowIdentityProps {
  name: string;
  deviceLabel: string;
  /** The runner is managed elsewhere, so this device only shows it. */
  readOnly: boolean;
}

export function RunnerRowIdentity({ name, deviceLabel, readOnly }: RunnerRowIdentityProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 @max-3xl:col-start-1',
        '@max-3xl:col-end-auto @max-3xl:row-start-1 @max-3xl:row-end-3',
        '@max-md:col-start-1 @max-md:col-end-auto @max-md:row-start-1',
        '@max-md:row-end-auto',
        'min-w-0',
      )}
      role="gridcell"
    >
      <span
        className={cn(
          'grid size-6 shrink-0 place-items-center rounded-sm',
          'bg-accent/5 text-accent',
        )}
      >
        <ServerIcon className="size-4.25" />
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex min-w-0">
          <strong
            title={name}
            className={cn(
              'overflow-hidden text-xs/4.5 font-semibold text-ellipsis',
              'whitespace-nowrap text-accent',
            )}
          >
            {name}
          </strong>
        </div>
        <div
          className={cn(
            'flex items-center gap-1.5 text-xs/4',
            'whitespace-nowrap text-muted',
            // Narrow rows move Read-only to a second line instead of cutting the device short.
            '@max-md:flex-wrap @max-md:gap-y-0',
          )}
        >
          <span className="min-w-0 overflow-hidden text-ellipsis" title={deviceLabel}>
            {deviceLabel}
          </span>
          {readOnly && <span className="shrink-0 text-xs text-muted">Read-only</span>}
        </div>
      </div>
    </div>
  );
}
