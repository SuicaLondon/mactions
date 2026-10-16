import { cn } from '../../../../shared/lib/cn';
import { PendingLabel } from '../../../../shared/ui/controls/buttons/PendingLabel';

interface ActionDialogButtonsProps {
  submitLabel: string;
  destructive: boolean;
  /** Focus Cancel first unless a field takes focus. */
  focusCancel: boolean;
  locked: boolean;
  pending: boolean;
  onCancel: () => void;
}

export function ActionDialogButtons({
  submitLabel,
  destructive,
  focusCancel,
  locked,
  pending,
  onCancel,
}: ActionDialogButtonsProps) {
  return (
    <div className="mt-6 flex justify-end gap-2">
      <button
        type="button"
        autoFocus={focusCancel}
        disabled={pending}
        onClick={onCancel}
        className="min-w-19.5 text-xs"
      >
        Cancel
      </button>
      <button
        type="submit"
        className={cn(
          { 'button-primary': !destructive, 'button-destructive': destructive },
          'min-w-19.5 text-xs',
        )}
        disabled={locked && !pending}
        aria-disabled={pending || undefined}
        aria-busy={pending || undefined}
      >
        <PendingLabel pending={pending} idle={submitLabel} busy={submitLabel} />
      </button>
    </div>
  );
}
