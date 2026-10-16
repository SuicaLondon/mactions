import { PlusIcon } from '../../../../shared/ui/icons/PlusIcon';

/** Opens Add runner; phones shorten the label to Add. */
export function AddRunnerButton({ disabled, onAdd }: { disabled: boolean; onAdd: () => void }) {
  return (
    <button
      type="button"
      className="min-h-7 button-primary text-xs max-md:min-h-10 pointer-coarse:min-h-10"
      aria-label="Add runner"
      disabled={disabled}
      onClick={onAdd}
    >
      <PlusIcon />
      <span className="max-sm:hidden">Add runner</span>
      <span className="sm:hidden">Add</span>
    </button>
  );
}
