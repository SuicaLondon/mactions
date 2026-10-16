import { cn } from '../../../../../shared/lib/cn';
import { SkeletonLine } from '../../../../../shared/ui/loading/components/SkeletonLine';

const VISIBLE_LABELS = 2;

interface RunnerRowLabelsProps {
  labels: string[];
  /** GitHub has not reported the runner's labels yet. */
  checking: boolean;
  /** Lists every label, including those the cell leaves out. */
  title: string | undefined;
}

/** Keeps labels on one line so every runner row has the same height; the cell title lists all. */
export function RunnerRowLabels({ labels, checking, title }: RunnerRowLabelsProps) {
  const hidden = labels.length - VISIBLE_LABELS;
  let content = (
    <div className="flex min-w-0 flex-nowrap items-center gap-0.75">
      {labels.slice(0, VISIBLE_LABELS).map((label) => (
        <span
          className={cn(
            'max-w-27.5 min-w-0 overflow-hidden rounded-xs bg-muted/5 px-1.25',
            'py-0.25 text-xs/4 text-ellipsis whitespace-nowrap text-muted',
          )}
          key={label}
        >
          {label}
        </span>
      ))}
      {hidden > 0 && (
        <span
          className="shrink-0 text-xs whitespace-nowrap text-muted"
          aria-label={`${hidden} more labels`}
        >
          +{hidden}
        </span>
      )}
    </div>
  );
  if (checking) {
    content = (
      <span className="flex h-5 items-center" aria-label="Checking labels">
        <SkeletonLine className="h-4 w-14 rounded-xs" />
      </span>
    );
  } else if (!labels.length) {
    content = <span className="shrink-0 text-xs text-muted">—</span>;
  }
  return (
    <div
      className="flex min-w-0 items-center gap-1.25 @max-5xl:hidden"
      role="gridcell"
      title={title}
    >
      {content}
    </div>
  );
}
