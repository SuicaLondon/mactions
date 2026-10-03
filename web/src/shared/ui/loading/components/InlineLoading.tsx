import { cn } from '../../../lib/cn';
import { SkeletonLine } from './SkeletonLine';

/** Keeps loading announcements accessible without rendering placeholder text. */
export function InlineLoading({
  label,
  className = 'h-4.5 w-35',
}: {
  label: string;
  className?: string;
}) {
  return (
    <span
      role="status"
      aria-label={label}
      aria-busy="true"
      className={cn(
        'inline-flex max-w-full animate-pulse items-center motion-reduce:animate-none',
        className,
      )}
    >
      <SkeletonLine className="w-full" />
    </span>
  );
}
