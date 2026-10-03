import type { JobStep } from '../../../../../shared/api/types';
import { stateFor } from '../../../../../shared/lib/activity-format';
import { cn } from '../../../../../shared/lib/cn';
import { LiveDuration } from '../../../../../shared/ui/duration/components/LiveDuration';
import { StatusIcon } from '../../../../../shared/ui/icons/status/StatusIcon';
import type { JobSummary } from '../../../data/types/activity-types';
import { statusTextClasses } from '../../../shared/models/status-classes';
import { type useJobTree } from '../../hooks/use-job-tree';
import type { JobSelection } from '../../types/job-selection';

export function JobTreeStep({
  step,
  stepIndex,
  count,
  selectedJob,
  selected,
  node,
  focused,
  setFocused,
  keyboard,
  job,
  onSelect,
}: {
  step: JobStep;
  stepIndex: number;
  count: number;
  selectedJob: boolean;
  node: string;
  job: JobSummary;
  focused: string | null;
  setFocused: (node: string) => void;
  keyboard: ReturnType<typeof useJobTree>['keyboard'];
  selected: JobSelection | null;
  onSelect: (selection: JobSelection) => void;
}) {
  const stepState = stateFor(step.status, step.conclusion);
  const stepNode = `${node}-step-${step.number}`;
  let stepTabIndex = -1;
  if (focused === stepNode) stepTabIndex = 0;
  return (
    <li role="none">
      <button
        role="treeitem"
        className={cn(
          'job-tree-row job-tree-step relative flex min-h-8 w-full items-center',
          'justify-start gap-2 rounded-sm border-0 bg-transparent px-1.75 py-1.5 text-left',
          'whitespace-normal text-foreground shadow-none -outline-offset-2 max-sm:gap-1',
          'aria-selected:border-l-2 aria-selected:border-l-accent max-sm:py-1.75',
          'hover:bg-muted/5 hover:filter-none aria-selected:bg-accent/10',
          {
            selected: selectedJob && selected?.stepNumber === step.number,
          },
        )}
        aria-label={`${step.name}, ${stepState.label}`}
        aria-level={2}
        aria-posinset={stepIndex + 1}
        aria-setsize={count}
        aria-selected={selectedJob && selected?.stepNumber === step.number}
        data-node={stepNode}
        data-parent={node}
        tabIndex={stepTabIndex}
        onFocus={() => setFocused(stepNode)}
        onKeyDown={(event) => keyboard(event, job.id, step.number)}
        onClick={() =>
          onSelect({
            jobId: job.id,
            stepNumber: step.number,
          })
        }
      >
        <span
          className="job-tree-step-number w-4 shrink-0 text-right text-xs text-muted tabular-nums"
          aria-hidden="true"
        >
          {stepIndex + 1}
        </span>
        <span
          className={cn(
            'tree-status-symbol inline-flex w-4.5 shrink-0 items-center text-muted',
            stepState.tone,
            statusTextClasses[stepState.tone],
          )}
          title={stepState.label}
        >
          <StatusIcon className="size-4.25 stroke-2" name={stepState.icon} />
        </span>
        <span className="job-tree-label min-w-0 flex-1 text-xs leading-normal">{step.name}</span>
        <span className="job-tree-duration shrink-0 text-xs text-muted tabular-nums max-sm:hidden">
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
