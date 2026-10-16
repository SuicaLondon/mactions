import { cn } from '../../../../../../shared/lib/cn';

export function JobLogWrapToggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={cn(
        'flex items-center gap-1.25',
        // On touch screens the whole label is the 40px hit area; the checkbox keeps its size.
        'max-md:min-h-10 pointer-coarse:min-h-10',
      )}
    >
      <input
        className="min-h-auto accent-blue-300"
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      Wrap lines
    </label>
  );
}
