import { cn } from '../../../lib/cn';
import { RefreshIcon } from '../../icons/RefreshIcon';

export function RefreshButton({
  label,
  className,
  disabled,
  onClick,
}: {
  label: string;
  className?: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn('min-h-7 text-xs max-md:min-h-10 pointer-coarse:min-h-10', className)}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      <RefreshIcon className="size-3.5" />
      Refresh
    </button>
  );
}
