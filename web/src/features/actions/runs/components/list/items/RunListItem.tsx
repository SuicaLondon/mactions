import { duration } from '../../../../../../shared/lib/activity-format';
import { cn } from '../../../../../../shared/lib/cn';
import { parseTimestamp } from '../../../../../../shared/lib/date';
import { BranchIcon } from '../../../../../../shared/ui/icons/git/BranchIcon';
import { ExternalLinkIcon } from '../../../../../../shared/ui/icons/navigation/ExternalLinkIcon';
import type { WorkflowRun } from '../../../../data/types/activity-types';
import { Status } from '../../../../shared/components/Status';
import { RunIdentityCell } from './RunIdentityCell';
import { RunStartTime } from './RunStartTime';

const runCellClasses = cn(
  'table-cell h-16 border-0 border-t border-line bg-surface px-3 py-2.25',
  'align-middle text-foreground group-hover/run:bg-accent/5 max-lg:px-2.25',
  'group-focus-within/run:bg-accent/5',
);

export function RunListItem({
  run,
  onOpen,
}: {
  run: WorkflowRun;
  onOpen: (run: WorkflowRun) => void;
}) {
  const started = parseTimestamp(run.started_at);
  let finished: string | null = null;
  if (run.status === 'completed') finished = run.updated_at;
  return (
    <tr
      className="workflow-run-row group/run cursor-pointer"
      onClick={(event) => {
        if (!(event.target as HTMLElement).closest('a, button')) onOpen(run);
      }}
    >
      <RunIdentityCell run={run} onOpen={onOpen} className={runCellClasses} />
      <td className={cn(runCellClasses, 'workflow-run-source max-md:hidden')}>
        <span
          className={cn(
            'workflow-run-repository block overflow-hidden leading-snug text-ellipsis',
            'whitespace-nowrap',
          )}
          title={run.repository}
        >
          {run.repository}
        </span>
        <span
          className={cn(
            'workflow-run-branch mt-1.25 flex min-w-0 items-center gap-1.25 text-xs',
            'text-muted',
          )}
        >
          <BranchIcon className="size-3 shrink-0" />
          <span
            className="overflow-hidden text-ellipsis whitespace-nowrap"
            title={run.branch || 'Unknown branch'}
          >
            {run.branch || 'Unknown branch'}
          </span>
          {!!run.head_sha && (
            <code className="ml-0.75 shrink-0 text-xs max-lg:hidden" title={run.head_sha}>
              {run.head_sha.slice(0, 7)}
            </code>
          )}
        </span>
      </td>
      <td className={cn(runCellClasses, 'workflow-run-result max-sm:px-1')}>
        <Status compact status={run.status} conclusion={run.conclusion} />
      </td>
      <td
        className={cn(
          runCellClasses,
          'workflow-run-duration text-right whitespace-nowrap tabular-nums',
        )}
      >
        {duration(run.started_at, finished, run.status === 'in_progress')}
      </td>
      <td
        className={cn(
          runCellClasses,
          'workflow-run-started text-xs text-muted tabular-nums max-lg:hidden',
        )}
      >
        <RunStartTime started={started} run={run} />
      </td>
      <td
        className={cn(
          runCellClasses,
          'workflow-run-link overflow-visible p-1 text-center text-clip whitespace-normal',
        )}
      >
        <a
          className={cn(
            'inline-grid h-7 w-6.5 place-items-center rounded-sm text-muted hover:bg-muted/10',
            'hover:text-accent',
          )}
          href={run.url}
          target="_blank"
          rel="noreferrer"
          aria-label={`View run #${run.number} on GitHub`}
          title="View on GitHub"
        >
          <ExternalLinkIcon className="size-3.5" />
        </a>
      </td>
    </tr>
  );
}
