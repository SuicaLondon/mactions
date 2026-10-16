import { duration } from '../../../../../shared/lib/activity-format';
import { UpdateFailedIndicator } from '../../../../../shared/ui/feedback/components/UpdateFailedIndicator';
import { BranchIcon } from '../../../../../shared/ui/icons/BranchIcon';
import type { WorkflowRun } from '../../../data/types/activity-types';
import type { RefreshState } from '../../../shared/types/refresh-state';

export function RunWorkspaceIdentity({
  run,
  refresh,
}: {
  run: WorkflowRun;
  refresh: RefreshState;
}) {
  let finished: string | null = null;
  if (run.status === 'completed') finished = run.updated_at;
  return (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <h2 className="m-0 text-base/tight font-semibold wrap-anywhere">
          {run.name}{' '}
          <span className="text-xs font-normal text-muted">
            #{run.number}
            {!!(run.attempt > 1) && ` · attempt ${run.attempt}`}
          </span>
        </h2>
      </div>
      {!!(run.title && run.title !== run.name) && (
        <p className="mx-0 mt-0.75 mb-0 text-xs/snug wrap-anywhere text-foreground">{run.title}</p>
      )}
      <div className="mt-1.25 flex flex-wrap items-center gap-3 text-xs text-muted">
        <span className="inline-flex items-center gap-1">{run.repository}</span>
        <span className="inline-flex items-center gap-1">
          <BranchIcon className="size-3" />
          {run.branch || 'Unknown branch'}
        </span>
        {!!run.head_sha && (
          <code className="text-xs" title={run.head_sha}>
            {run.head_sha.slice(0, 7)}
          </code>
        )}
        <span className="inline-flex items-center gap-1">
          {duration(run.started_at, finished, run.status === 'in_progress')}
        </span>
        <UpdateFailedIndicator
          error={refresh.error}
          retrying={refresh.refreshing}
          onRetry={refresh.onRefresh}
        />
      </div>
    </div>
  );
}
