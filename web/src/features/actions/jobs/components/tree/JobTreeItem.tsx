import type { Job } from '../../../../../shared/api/types';
import { jobRunnerName, stateFor } from '../../../../../shared/lib/activity-format';
import { cn } from '../../../../../shared/lib/cn';
import { LiveDuration } from '../../../../../shared/ui/duration/components/LiveDuration';
import { ChevronIcon } from '../../../../../shared/ui/icons/ChevronIcon';
import { StatusIcon } from '../../../../../shared/ui/icons/StatusIcon';
import type { JobSummary } from '../../../data/types/activity-types';
import { statusTextClasses } from '../../../shared/models/status-classes';
import { jobTreeNode } from '../../models/job-tree-node';
import type { JobSelection } from '../../types/job-selection';
import type { TreePosition } from '../../types/tree-position';
import { JobTreeSteps } from './JobTreeSteps';

/**
 * A job row and, when expanded, its steps. The tree handles focus, keys, and clicks for
 * every row, so this only draws the row's state.
 */
export function JobTreeItem({
  job,
  position,
  detail,
  expanded,
  ranOnSelectedRunner,
  selection,
  tabbable,
}: {
  job: JobSummary;
  position: TreePosition;
  detail: Job | undefined;
  expanded: boolean;
  /** The job ran on the runner the page is showing. */
  ranOnSelectedRunner: boolean;
  /** The tree's selection, given only when it is this job or one of its steps. */
  selection: JobSelection | undefined;
  /** The `data-node` id of the row that takes Tab focus. */
  tabbable: string;
}) {
  const state = stateFor(job.status, job.conclusion);
  const failed = state.tone === 'failure';

  const node = jobTreeNode(job.id);
  const selectedRow = !!selection && selection.stepNumber === undefined;
  let ownedSteps: string | undefined;
  if (expanded) ownedSteps = `job-tree-${job.id}-steps`;
  let tabIndex = -1;
  if (tabbable === node) tabIndex = 0;
  const assignmentLabels = [jobRunnerName(job)];
  if (job.runner_name || job.runner_id) {
    if (job.host_type === 'github-hosted') assignmentLabels.push('GitHub-hosted');
    else if (job.host_type === 'self-hosted') assignmentLabels.push('Self-hosted');
    if (job.device === 'this_device') assignmentLabels.push('This device');
    else if (job.device === 'other_device') assignmentLabels.push('Other device');
  }
  const assignment = assignmentLabels.join(' · ');

  return (
    <li
      role="none"
      data-selected-runner={ranOnSelectedRunner || undefined}
      className={cn('relative', { 'bg-accent/5': ranOnSelectedRunner })}
    >
      <button
        role="treeitem"
        className={cn(
          'flex min-h-13.5 w-full items-center justify-start gap-2',
          'rounded-none border-0 bg-transparent px-3 py-2.5 text-left whitespace-normal',
          'text-foreground shadow-none -outline-offset-2 max-sm:gap-1 max-sm:py-1.75',
          'hover:bg-muted/5',
          'hover:filter-none aria-selected:bg-accent/10',
          { 'bg-activity-failure/5': failed },
        )}
        aria-label={`${job.name}, ${state.label}, ${assignment}`}
        aria-level={1}
        aria-posinset={position.index + 1}
        aria-setsize={position.count}
        aria-expanded={expanded}
        aria-selected={selectedRow}
        aria-controls={`job-tree-${job.id}-steps`}
        aria-owns={ownedSteps}
        data-node={node}
        tabIndex={tabIndex}
      >
        <span
          className={cn('inline-flex h-5 w-3.25 shrink-0 items-center justify-center', {
            'rotate-90': expanded,
          })}
          data-disclosure
        >
          <ChevronIcon className="size-2.75 text-muted" />
        </span>
        <span
          className={cn(
            'inline-flex w-4.5 shrink-0 items-center text-muted',
            state.tone,
            statusTextClasses[state.tone],
          )}
          title={state.label}
        >
          <StatusIcon className="size-4.25 stroke-2" name={state.icon} />
        </span>
        <span className="min-w-0 flex-1 text-xs/normal">
          <strong
            className={cn('block truncate text-xs font-medium', {
              'text-activity-failure': failed,
            })}
            title={job.name}
          >
            {job.name}
          </strong>
          <span
            className={cn(
              'mt-0.25 flex min-w-0 items-center gap-1.25 overflow-hidden',
              'text-xs whitespace-nowrap text-muted max-sm:text-xs',
            )}
            title={assignment}
          >
            <span className="min-w-0 truncate">{assignment}</span>
            {!!ranOnSelectedRunner && (
              <span
                className={cn(
                  'ml-1.5 rounded-sm bg-accent/10 px-1 text-xs',
                  'whitespace-nowrap text-accent',
                )}
                title="Assigned to the selected runner"
              >
                Selected runner
              </span>
            )}
          </span>
        </span>
        <span className="shrink-0 text-xs text-muted tabular-nums max-sm:hidden">
          <LiveDuration
            start={job.started_at}
            end={job.completed_at}
            running={job.status === 'in_progress'}
          />
        </span>
      </button>
      {!!expanded && (
        <ul
          id={`job-tree-${job.id}-steps`}
          role="group"
          aria-label={`Steps for ${job.name}`}
          className={cn(
            'm-0 mt-0 mr-2.5 mb-2.5 ml-5.5 list-none rounded-md bg-muted/5',
            'p-1 max-sm:mr-1.5 max-sm:ml-2',
          )}
        >
          <JobTreeSteps jobId={job.id} detail={detail} selection={selection} tabbable={tabbable} />
        </ul>
      )}
    </li>
  );
}
