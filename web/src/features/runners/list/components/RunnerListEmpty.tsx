import { cn } from '../../../../shared/lib/cn';
import { ServerIcon } from '../../../../shared/ui/icons/ServerIcon';
import type { LocalRunners } from '../models/runner-list';
import { runnerEmptyDescription, runnerEmptyTitle } from '../models/runner-list-status';

interface RunnerListEmptyProps {
  /** Rows before filtering; any means the filters hide them. */
  rowCount: number;
  local: Pick<LocalRunners, 'error' | 'onRefresh'>;
  localFetching: boolean;
  onAdd: () => void;
}
export function RunnerListEmpty({ rowCount, local, localFetching, onAdd }: RunnerListEmptyProps) {
  // Distinct keys stop React reusing Try again as Add runner, which would carry its focus over.
  let action = (
    <button key="add" className="button-primary" onClick={onAdd}>
      Add runner
    </button>
  );
  if (local.error) {
    action = (
      <button key="retry" onClick={local.onRefresh} disabled={localFetching}>
        Try again
      </button>
    );
  }
  return (
    <div
      className={cn(
        'mx-0 mb-4.5 flex min-h-77.5 flex-1 flex-col',
        'items-center justify-center px-6 py-10 text-center max-md:min-h-61.25',
      )}
    >
      <ServerIcon className="mb-4.5 size-11.5 stroke-2 text-muted" />
      <h2 className="m-0 text-base font-semibold tracking-tight">
        {runnerEmptyTitle(rowCount, local.error)}
      </h2>
      <p className="mt-2 max-w-67.5 text-xs/relaxed text-muted">
        {runnerEmptyDescription(rowCount, local.error)}
      </p>
      {!rowCount && action}
    </div>
  );
}
