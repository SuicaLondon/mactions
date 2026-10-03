import { duration } from '../../../../../shared/lib/activity-format';
import { cn } from '../../../../../shared/lib/cn';
import { RefreshButton } from '../../../../../shared/ui/controls/buttons/RefreshButton';
import { BranchIcon } from '../../../../../shared/ui/icons/git/BranchIcon';
import { ExternalLinkIcon } from '../../../../../shared/ui/icons/navigation/ExternalLinkIcon';
import { type useRun } from '../../../data/hooks/use-run';
import type { JobSummary, WorkflowRun } from '../../../data/types/activity-types';
import { Status } from '../../../shared/components/Status';

export function RunWorkspaceHeader({
  current,
  query,
  completed,
  jobs,
  failed,
}: {
  current: WorkflowRun;
  query: ReturnType<typeof useRun>;
  completed: number;
  jobs: JobSummary[];
  failed: number;
}) {
  let finished: string | null = null;
  if (current.status === 'completed') finished = current.updated_at;
  return (
    <header
      className={cn(
        'run-workspace-heading flex shrink-0 items-center justify-between gap-4 border-b',
        'border-b-line px-4.5 py-2.5 max-md:px-3 max-sm:flex-col max-sm:items-stretch',
        'max-sm:gap-2',
      )}
    >
      <div className="run-workspace-identity min-w-0 flex-1">
        <div className="run-workspace-title-line flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <span className="run-workspace-context shrink-0 text-xs leading-5 text-muted">
            GitHub Actions
          </span>
          <h2 className="m-0 text-base leading-tight font-semibold wrap-anywhere">
            {current.name}{' '}
            <span className="text-xs font-normal text-muted">
              #{current.number}
              {!!(current.attempt > 1) && ` · attempt ${current.attempt}`}
            </span>
          </h2>
        </div>
        {!!(current.title && current.title !== current.name) && (
          <p className="run-title mx-0 mt-0.75 mb-0 text-xs leading-snug wrap-anywhere text-foreground">
            {current.title}
          </p>
        )}
        <div className="run-workspace-meta mt-1.25 flex flex-wrap items-center gap-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1">{current.repository}</span>
          <span className="inline-flex items-center gap-1">
            <BranchIcon className="size-3" />
            {current.branch || 'Unknown branch'}
          </span>
          {!!current.head_sha && (
            <code className="text-xs" title={current.head_sha}>
              {current.head_sha.slice(0, 7)}
            </code>
          )}
          <span className="inline-flex items-center gap-1">
            {duration(current.started_at, finished, current.status === 'in_progress')}
          </span>
        </div>
      </div>
      <div
        className={cn(
          'run-workspace-actions flex max-w-80 shrink-0 flex-wrap items-center justify-end',
          'gap-2.5 pt-0 max-md:max-w-45 max-md:gap-1.75 max-sm:max-w-none',
          'max-sm:justify-start',
        )}
      >
        {!!query.data && (
          <span
            className={cn(
              'run-workspace-progress flex items-center gap-2 text-xs whitespace-nowrap',
              'text-muted',
            )}
          >
            {completed}/{jobs.length} jobs
            {!!failed && <span className="text-activity-failure">{failed} failed</span>}
          </span>
        )}
        <Status status={current.status} conclusion={current.conclusion} />
        <a
          className="inline-flex items-center gap-1 text-xs text-muted no-underline hover:text-accent"
          href={current.url}
          target="_blank"
          rel="noreferrer"
          aria-label="View workflow run on GitHub"
        >
          <ExternalLinkIcon className="size-3.25" />
          GitHub
        </a>
        <RefreshButton
          label="Refresh run"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        />
      </div>
    </header>
  );
}
