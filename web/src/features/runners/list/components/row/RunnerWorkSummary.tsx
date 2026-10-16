import { cn } from '../../../../../shared/lib/cn';
import { InlineLoading } from '../../../../../shared/ui/loading/components/InlineLoading';
import type { RunnerWorkState } from '../../models/runner-row';
import { assignedRuns, noWorkMessage } from '../../models/runner-work';
import { RunnerWorkRunLine } from './RunnerWorkRunLine';

export function RunnerWorkSummary({
  work: { runs, loading, connected, unavailable },
  githubId,
  busy,
}: {
  work: RunnerWorkState;
  githubId?: number;
  busy: boolean | null;
}) {
  const assigned = assignedRuns(runs, githubId);
  if (!assigned.length && loading)
    return <InlineLoading label="Loading current work" className="flex h-4.5 w-35" />;
  if (!assigned.length) {
    const message = noWorkMessage({ connected, unavailable, githubId, busy });
    return (
      <span
        className={cn(
          'block overflow-hidden text-xs/4.5 text-ellipsis',
          'whitespace-nowrap text-muted @max-3xl:text-xs',
        )}
        title={message}
      >
        {message}
      </span>
    );
  }
  return (
    <div
      className={cn('relative flex min-w-0 flex-col gap-0.5', {
        'pr-10.5': assigned.length > 2,
      })}
    >
      {assigned.slice(0, 2).map(({ run, jobs }) => (
        <RunnerWorkRunLine key={`${run.repository}:${run.id}`} run={run} jobs={jobs} />
      ))}
      {!!(assigned.length > 2) && (
        <span
          className="absolute right-0 bottom-0 shrink-0 text-xs text-muted"
          title={assigned
            .slice(2)
            .map(({ run }) => `${run.name} #${run.number}`)
            .join(', ')}
        >
          +{assigned.length - 2} runs
        </span>
      )}
    </div>
  );
}
