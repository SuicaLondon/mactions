import type { JobStep } from '../../../../../shared/api/types';
import { stateFor } from '../../../../../shared/lib/activity-format';
import { cn } from '../../../../../shared/lib/cn';
import { LiveDuration } from '../../../../../shared/ui/duration/components/LiveDuration';
import { StatusIcon } from '../../../../../shared/ui/icons/StatusIcon';
import { statusTextClasses } from '../../../shared/models/status-classes';
import { jobTreeNode, jobTreeStepNode } from '../../models/job-tree-node';
import type { TreePosition } from '../../types/tree-position';

export function JobTreeStep({
  jobId,
  step,
  position,
  selected,
  tabbable,
}: {
  jobId: number;
  step: JobStep;
  position: TreePosition;
  selected: boolean;
  /** The `data-node` id of the row that takes Tab focus. */
  tabbable: string;
}) {
  const stepState = stateFor(step.status, step.conclusion);
  const node = jobTreeStepNode(jobId, step.number);
  let tabIndex = -1;
  if (tabbable === node) tabIndex = 0;
  return (
    <li role="none">
      <button
        role="treeitem"
        className={cn(
          'relative flex min-h-8 w-full items-center',
          'justify-start gap-2 rounded-sm border-0 bg-transparent px-1.75 py-1.5 text-left',
          'whitespace-normal text-foreground shadow-none -outline-offset-2 max-sm:gap-1',
          'max-sm:py-1.75',
          'hover:bg-muted/5 hover:filter-none aria-selected:bg-accent/10',
        )}
        aria-label={`${step.name}, ${stepState.label}`}
        aria-level={2}
        aria-posinset={position.index + 1}
        aria-setsize={position.count}
        aria-selected={selected}
        data-node={node}
        data-parent={jobTreeNode(jobId)}
        tabIndex={tabIndex}
      >
        <span
          className="w-4 shrink-0 text-right text-xs text-muted tabular-nums"
          aria-hidden="true"
        >
          {position.index + 1}
        </span>
        <span
          className={cn(
            'inline-flex w-4.5 shrink-0 items-center text-muted',
            stepState.tone,
            statusTextClasses[stepState.tone],
          )}
          title={stepState.label}
        >
          <StatusIcon className="size-4.25 stroke-2" name={stepState.icon} />
        </span>
        <span className="min-w-0 flex-1 text-xs/normal">{step.name}</span>
        <span className="shrink-0 text-xs text-muted tabular-nums max-sm:hidden">
          <LiveDuration
            start={step.started_at}
            end={step.completed_at}
            running={step.status === 'in_progress'}
          />
        </span>
      </button>
    </li>
  );
}
