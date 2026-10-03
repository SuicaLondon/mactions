import { cn } from '../../../../shared/lib/cn';
import { ServerIcon } from '../../../../shared/ui/icons/system/ServerIcon';
interface RunnerListEmptyProps {
  rowCount: number;
  localError?: string;
  localFetching: boolean;
  emptyTitle: string;
  onRefreshLocal: () => void;
  onAdd: () => void;
}
export function RunnerListEmpty({
  rowCount,
  localError,
  localFetching,
  emptyTitle,
  onRefreshLocal,
  onAdd,
}: RunnerListEmptyProps) {
  let emptyDescription = localError || 'Add a runner or choose another organization or repository.';
  if (rowCount) emptyDescription = 'Try another search, status or device filter.';
  return (
    <div
      className={cn(
        'empty mx-0 mb-4.5 flex min-h-77.5 flex-1 flex-col',
        'items-center justify-center px-6 py-10 text-center max-md:min-h-61.25',
      )}
    >
      <ServerIcon className="mb-4.5 size-11.5 stroke-2 text-zinc-400" />
      <h2 className="m-0 text-base font-semibold tracking-tight">{emptyTitle}</h2>
      <p className="mt-2 max-w-67.5 text-xs leading-relaxed text-muted">{emptyDescription}</p>
      {!!(!rowCount && localError) && (
        <button onClick={onRefreshLocal} disabled={localFetching}>
          Try again
        </button>
      )}
      {!!(!rowCount && !localError) && (
        <button className="primary" onClick={onAdd}>
          Add Runner
        </button>
      )}
    </div>
  );
}
