import { cn } from '../../../../../shared/lib/cn';
import { InlineLoading } from '../../../../../shared/ui/loading/components/InlineLoading';
import type { WorkflowRun } from '../../../../actions/data/types/activity-types';
import { RunnerWorkRunLine } from './RunnerWorkRunLine';

export function RunnerWorkSummary({
  runs,
  githubId,
  loading,
  connected,
  unavailable,
  busy,
}: {
  runs: WorkflowRun[];
  githubId?: number;
  loading: boolean;
  connected: boolean | undefined;
  unavailable: boolean;
  busy: boolean | null;
}) {
  const assigned = [];
  if (githubId) {
    for (const run of runs) {
      const jobs = run.jobs?.filter((job) => job.runner_id === githubId) ?? [];
      if (jobs.length) assigned.push({ run, jobs });
    }
  }
  if (!assigned.length && (connected === undefined || loading))
    return <InlineLoading label="Loading current work" className="h-4.5 w-35" />;
  if (!assigned.length) {
    let message = 'No jobs reported';
    if (!connected) message = 'GitHub disconnected';
    else if (unavailable) message = 'Work unavailable';
    else if (!githubId) message = 'Runner identity unavailable';
    else if (busy === false) message = 'No active jobs';
    return (
      <span
        className={cn(
          'runner-no-work block overflow-hidden text-xs leading-4.5 text-ellipsis',
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
      className={cn('runner-work-summary relative flex min-w-0 flex-col gap-0.5', {
        'pr-10.5': assigned.length > 2,
      })}
    >
      {assigned.slice(0, 2).map(({ run, jobs }) => (
        <RunnerWorkRunLine key={`${run.repository}:${run.id}`} run={run} jobs={jobs} />
      ))}
      {!!(assigned.length > 2) && (
        <span
          className="runner-work-overflow absolute right-0 bottom-0 shrink-0 text-xs text-muted"
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
