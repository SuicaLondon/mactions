import { cn } from '../../../../shared/lib/cn';
import { BranchIcon } from '../../../../shared/ui/icons/git/BranchIcon';
import type { WorkflowRun } from '../../types/workflow-graph';

interface WorkflowRunSourceProps {
  run: WorkflowRun;
}

export function WorkflowRunSource({ run }: WorkflowRunSourceProps) {
  const first = run.jobs[0];
  const running = run.jobs.filter((job) => job.status === 'in_progress').length;
  let attemptLabel = '';
  if (first.run_attempt && first.run_attempt > 1) attemptLabel = ` · Attempt ${first.run_attempt}`;
  let jobNoun = 'jobs';
  if (run.jobs.length === 1) jobNoun = 'job';
  return (
    <div
      className={cn(
        'workflow-graph-source relative flex min-w-0 items-start gap-2.25 rounded-lg',
        'border border-line bg-surface p-3 after:absolute after:top-1/2',
        "after:-right-6.25 after:h-0.25 after:w-6 after:bg-muted/45 after:content-['']",
      )}
    >
      <span
        className={cn(
          'workflow-graph-source-icon grid h-6 w-6 shrink-0 place-items-center rounded-md',
          'bg-canvas text-muted',
        )}
      >
        <BranchIcon className="size-3.5" />
      </span>
      <div className="workflow-graph-source-copy mx-0 mb-1.75 min-w-0">
        <span className="text-xs text-muted">
          Run #{first.run_number}
          {attemptLabel}
        </span>
        <h4 className="mt-1 text-xs leading-snug font-semibold wrap-anywhere">
          {first.workflow || 'Workflow'}
        </h4>
        <p
          className="mt-0 truncate font-mono text-xs leading-relaxed text-muted"
          title={first.branch}
        >
          {first.branch || 'Unknown branch'}
        </p>
        <small className="text-xs text-muted">
          {run.jobs.length} {jobNoun}
          {!!running && ` · ${running} running`}
        </small>
      </div>
    </div>
  );
}
