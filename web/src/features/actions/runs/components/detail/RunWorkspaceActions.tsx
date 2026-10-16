import { cn } from '../../../../../shared/lib/cn';
import { RefreshButton } from '../../../../../shared/ui/controls/buttons/RefreshButton';
import { ExternalLinkIcon } from '../../../../../shared/ui/icons/ExternalLinkIcon';
import type { WorkflowRun } from '../../../data/types/activity-types';
import { Status } from '../../../shared/components/Status';
import type { RefreshState } from '../../../shared/types/refresh-state';
import { type RunProgress, runProgressLabel } from '../../models/run-progress';

export function RunWorkspaceActions({
  run,
  progress,
  refresh,
}: {
  run: WorkflowRun;
  progress: RunProgress | null;
  refresh: RefreshState;
}) {
  return (
    <div
      className={cn(
        'flex max-w-80 shrink-0 flex-wrap items-center justify-end',
        'gap-2.5 pt-0 max-md:max-w-45 max-md:gap-1.75 max-sm:max-w-none',
        'max-sm:justify-start',
      )}
    >
      {!!progress && (
        <span
          className={cn('flex items-center gap-2 text-xs whitespace-nowrap', {
            'text-muted': !progress.failed,
            'text-activity-failure': progress.failed > 0,
          })}
        >
          {runProgressLabel(progress)}
        </span>
      )}
      <Status status={run.status} conclusion={run.conclusion} />
      <a
        className={cn(
          'inline-flex items-center gap-1 text-xs text-muted no-underline hover:text-accent',
          'max-md:min-h-10 pointer-coarse:min-h-10',
        )}
        href={run.url}
        target="_blank"
        rel="noreferrer"
        aria-label="View workflow run on GitHub"
      >
        <ExternalLinkIcon className="size-3.25" />
        GitHub
      </a>
      <RefreshButton
        label="Refresh run"
        disabled={refresh.refreshing}
        onClick={refresh.onRefresh}
      />
    </div>
  );
}
