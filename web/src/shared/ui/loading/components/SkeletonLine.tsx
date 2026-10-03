import { cn } from '../../../lib/cn';

export function SkeletonLine({ className = 'w-35' }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('skeleton-line block h-2.5 max-w-full rounded-sm bg-muted/15', className)}
    />
  );
}
