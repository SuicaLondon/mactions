import type { Job } from '../../../../../shared/api/types';
import { jobRunnerName, stateFor } from '../../../../../shared/lib/activity-format';
import { cn } from '../../../../../shared/lib/cn';
import { LiveDuration } from '../../../../../shared/ui/duration/components/LiveDuration';
import { ChevronIcon } from '../../../../../shared/ui/icons/navigation/ChevronIcon';
import { StatusIcon } from '../../../../../shared/ui/icons/status/StatusIcon';
import type { JobSummary } from '../../../data/types/activity-types';
import { statusTextClasses } from '../../../shared/models/status-classes';
import { type useJobTree } from '../../hooks/use-job-tree';
import type { JobSelection } from '../../types/job-selection';
import { JobTreeSteps } from './JobTreeSteps';

export function JobTreeItem({
  job,
  index,
  count,
  detail,
  expanded,
  highlightRunnerId,
  selected,
  focused,
  first,
  setFocused,
  keyboard,
  onSelect,
  onToggle,
}: {
  job: JobSummary;
  index: number;
  count: number;
  detail: Job | undefined;
  expanded: boolean;
  highlightRunnerId?: number;
  first: string;
  focused: string | null;
  setFocused: (node: string) => void;
  keyboard: ReturnType<typeof useJobTree>['keyboard'];
  selected: JobSelection | null;
  onSelect: (selection: JobSelection) => void;
  onToggle: (jobId: number, expanded: boolean) => void;
}) {
  const state = stateFor(job.status, job.conclusion);

  const highlighted = highlightRunnerId !== undefined && job.runner_id === highlightRunnerId;
  const selectedJob = selected?.jobId === job.id;
  const node = `job-${job.id}`;
  let ownedSteps: string | undefined;
  if (expanded) ownedSteps = `job-tree-${job.id}-steps`;
  let tabIndex = -1;
  if ((focused ?? first) === node) tabIndex = 0;
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
      className={cn('job-tree-item relative', {
        'assigned-to-selected-runner border-l-2 border-l-accent': highlighted,
      })}
    >
      <button
        role="treeitem"
        className={cn(
          'job-tree-row flex min-h-13.5 w-full items-center justify-start gap-2',
          'rounded-none border-0 bg-transparent px-3 py-2.5 text-left whitespace-normal',
          'text-foreground shadow-none -outline-offset-2 max-sm:gap-1 max-sm:py-1.75',
          'hover:bg-muted/5 aria-selected:border-l-2 aria-selected:border-l-accent',
          'hover:filter-none aria-selected:bg-accent/10',
          {
            selected: selectedJob && selected.stepNumber === undefined,
          },
        )}
        aria-label={`${job.name}, ${state.label}, ${assignment}`}
        aria-level={1}
        aria-posinset={index + 1}
        aria-setsize={count}
        aria-expanded={expanded}
        aria-selected={selectedJob && selected.stepNumber === undefined}
        aria-controls={`job-tree-${job.id}-steps`}
        aria-owns={ownedSteps}
        data-node={node}
        tabIndex={tabIndex}
        onFocus={() => setFocused(node)}
        onKeyDown={(event) => keyboard(event, job.id)}
        onClick={(event) => {
          if ((event.target as Element).closest('[data-disclosure]')) {
            if (!expanded) onSelect({ jobId: job.id });
            onToggle(job.id, !expanded);
          } else {
            onSelect({ jobId: job.id });
            onToggle(job.id, true);
          }
        }}
      >
        <span
          className={cn(
            'job-tree-disclosure inline-flex h-5 w-3.25 shrink-0 items-center justify-center',
            { 'rotate-90': expanded },
          )}
          data-disclosure
        >
          <ChevronIcon className="size-2.75 text-muted" />
        </span>
        <span
          className={cn(
            'tree-status-symbol inline-flex w-4.5 shrink-0 items-center text-muted',
            state.tone,
            statusTextClasses[state.tone],
          )}
          title={state.label}
        >
          <StatusIcon className="size-4.25 stroke-2" name={state.icon} />
        </span>
        <span className="job-tree-label min-w-0 flex-1 text-xs leading-normal">
          <strong className="block overflow-hidden text-xs font-medium text-ellipsis whitespace-nowrap">
            {job.name}
          </strong>
          <span
            className={cn(
              'job-tree-meta mt-0.25 flex items-center gap-1.25 overflow-hidden text-xs',
              'text-ellipsis whitespace-nowrap text-muted max-sm:text-xs',
            )}
            title={assignment}
          >
            {assignment}
            {!!highlighted && (
              <span
                className={cn(
                  'selected-runner-mark ml-1.5 hidden border-l-2 border-l-accent pl-1.25 text-xs',
                  'whitespace-nowrap text-muted',
                )}
                title="Assigned to the selected runner"
              >
                Selected runner
              </span>
            )}
          </span>
        </span>
        <span className="job-tree-duration shrink-0 text-xs text-muted tabular-nums max-sm:hidden">
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
            'job-tree-children m-0 mt-0 mr-2.5 mb-2.5 ml-5.5 list-none rounded-md bg-muted/5',
            'p-1 max-sm:mr-1.5 max-sm:ml-2',
          )}
        >
          <JobTreeSteps
            detail={detail}
            selectedJob={selectedJob}
            selected={selected}
            node={node}
            focused={focused}
            setFocused={setFocused}
            keyboard={keyboard}
            job={job}
            onSelect={onSelect}
          />
        </ul>
      )}
    </li>
  );
}
