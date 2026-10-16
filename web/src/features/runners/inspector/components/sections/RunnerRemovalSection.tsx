import type { Action } from '../../../../../shared/api/types';
import { cn } from '../../../../../shared/lib/cn';
import { TrashIcon } from '../../../../../shared/ui/icons/TrashIcon';

interface RunnerRemovalSectionProps {
  /** A deregistered runner has nothing left on GitHub, so it can be deleted while disconnected. */
  deregistered: boolean;
  locked: boolean;
  connected: boolean;
  onAction: (action: Action) => void;
}

export function RunnerRemovalSection({
  deregistered,
  locked,
  connected,
  onAction,
}: RunnerRemovalSectionProps) {
  let deleteTitle: string | undefined;
  if (!connected) deleteTitle = 'Connect GitHub to deregister this runner';
  return (
    <section
      className={cn(
        'mx-0 mt-0 mb-3 flex flex-col items-start',
        'gap-2 border-t border-t-line px-4.5 py-3.75',
      )}
    >
      <button
        className="text-xs text-danger"
        disabled={locked || (!connected && !deregistered)}
        title={deleteTitle}
        onClick={() => onAction('delete')}
      >
        <TrashIcon className="size-3" />
        Delete runner…
      </button>
      <p className="m-0 text-xs/normal text-muted">
        Stops the runner, removes it from GitHub, and deletes its files. To keep the files, stop it
        instead.
      </p>
    </section>
  );
}
