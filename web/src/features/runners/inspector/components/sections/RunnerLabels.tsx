import type { RunnerLabel } from '../../../../../shared/api/types';
import { cn } from '../../../../../shared/lib/cn';
import { LockIcon } from '../../../../../shared/ui/icons/LockIcon';

/** The runner's labels; GitHub's default labels are marked read-only. */
export function RunnerLabels({ labels }: { labels: RunnerLabel[] }) {
  if (!labels.length)
    return <span className="mx-0 mt-2 mb-0 text-xs/normal text-muted">No custom labels</span>;
  return labels.map((label) => {
    let title = 'GitHub default · read-only';
    if (label.type === 'custom') title = 'Custom label';
    return (
      <span
        key={label.name}
        className={cn(
          'inline-flex max-w-full items-center gap-1 rounded-md border border-line',
          'bg-surface px-1.5 py-0.75 text-xs wrap-anywhere',
        )}
        title={title}
      >
        {label.type !== 'custom' && <LockIcon className="size-2.5 text-muted" />}
        {label.name}
      </span>
    );
  });
}
