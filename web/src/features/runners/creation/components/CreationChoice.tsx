import { cn } from '../../../../shared/lib/cn';

export interface CreationChoiceProps {
  title: string;
  description: string;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}

export function CreationChoice({
  title,
  description,
  selected,
  disabled,
  onSelect,
}: CreationChoiceProps) {
  return (
    <button
      type="button"
      className={cn(
        'create-choice aria-pressed:border-accent aria-pressed:inset-ring-1',
        'flex min-w-0 flex-col items-start justify-start aria-pressed:bg-accent/5',
        'rounded-lg border border-line bg-surface px-3 py-2.75 text-left',
        'group whitespace-normal shadow-none inset-ring-accent',
      )}
      aria-label={`${title}: ${description}`}
      aria-pressed={selected}
      disabled={disabled}
      onClick={onSelect}
    >
      <strong className="text-xs font-semibold group-aria-pressed:text-accent">{title}</strong>
      <span className="mt-0.75 text-xs leading-snug text-muted">{description}</span>
    </button>
  );
}
