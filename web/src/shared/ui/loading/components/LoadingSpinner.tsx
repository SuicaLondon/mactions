import { cn } from '../../../lib/cn';

export function LoadingSpinner({ label = 'Loading' }: { label?: string }) {
  return (
    <span
      role="status"
      aria-label={label}
      aria-busy="true"
      className={cn(
        'inline-block size-3.5 shrink-0 animate-spin rounded-full border-2 border-current',
        'border-r-transparent motion-reduce:animate-none',
      )}
    />
  );
}
