import type { Action, Runner } from '../../../../../shared/api/types';
import { cn } from '../../../../../shared/lib/cn';
import { TrashIcon } from '../../../../../shared/ui/icons/actions/TrashIcon';

interface RunnerRemovalSectionProps {
  runner: Runner;
  locked: boolean;
  connected: boolean;
  onAction: (runner: Runner, action: Action) => void;
}
export function RunnerRemovalSection({
  runner: r,
  locked,
  connected,
  onAction,
}: RunnerRemovalSectionProps) {
  let deleteTitle: string | undefined;
  if (!connected) deleteTitle = 'Connect GitHub to deregister this runner';
  return (
    <section
      className={cn(
        'detail-section destructive-section mx-0 mt-0 mb-3 flex flex-col items-start',
        'gap-2 border-t border-t-line px-4.5 py-3.75',
      )}
    >
      <button
        className="danger text-xs"
        disabled={locked || (!connected && !r.deregistered)}
        title={deleteTitle}
        onClick={() => onAction(r, 'delete')}
      >
        <TrashIcon className="size-3" />
        Delete Runner…
      </button>
      <p className="detail-help mx-0 mt-2 mb-0 hidden text-xs leading-normal text-muted">
        Removes this runner and its workspace.
        <br />
        Stop it to keep its files.
      </p>
    </section>
  );
}
