import { cn } from '../../../../../shared/lib/cn';
import { ServerIcon } from '../../../../../shared/ui/icons/system/ServerIcon';
import type { DisplayRunner } from '../../models/runner-list';
interface RunnerRowIdentityProps {
  row: DisplayRunner;
  deviceLabel: string;
}
export function RunnerRowIdentity({ row, deviceLabel }: RunnerRowIdentityProps) {
  return (
    <div
      className={cn(
        cn(
          'runner-grid-identity flex items-center gap-2 @max-3xl:col-start-1',
          '@max-3xl:col-end-auto @max-3xl:row-start-1 @max-3xl:row-end-3',
          '@max-md:col-start-1 @max-md:col-end-auto @max-md:row-start-1',
          '@max-md:row-end-auto',
        ),
        'min-w-0',
      )}
      role="gridcell"
    >
      <span
        className={cn(
          'runner-identity-icon grid size-6 shrink-0 place-items-center rounded-sm',
          'bg-accent/5 text-accent',
        )}
      >
        <ServerIcon className="size-4.25" />
      </span>
      <div className="runner-identity-copy flex min-w-0 flex-col gap-0.5">
        <div className="runner-identity-line flex min-w-0">
          <strong
            title={row.name}
            className={cn(
              'overflow-hidden text-xs leading-4.5 font-semibold text-ellipsis',
              'whitespace-nowrap text-activity-link',
            )}
          >
            {row.name}
          </strong>
        </div>
        <div
          className={cn(
            'runner-identity-meta flex items-center gap-1.5 text-xs leading-4',
            'whitespace-nowrap text-muted',
          )}
        >
          <span className="runner-device overflow-hidden text-ellipsis">{deviceLabel}</span>
          {!row.local && (
            <span className="runner-readonly shrink-0 text-xs text-muted">Read-only</span>
          )}
        </div>
      </div>
    </div>
  );
}
