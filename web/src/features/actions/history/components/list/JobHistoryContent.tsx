import { cn } from '../../../../../shared/lib/cn';
import { LoadingPlaceholder } from '../../../../../shared/ui/loading/components/LoadingPlaceholder';
import { type useJobHistory } from '../../../data/hooks/use-job-history';
import type { JobSummary } from '../../../data/types/activity-types';
import { HistoryLoadMoreLabel } from './HistoryLoadMoreLabel';
import { HistoryTable } from './HistoryTable';
import { type JobHistory } from './JobHistory';

export function JobHistoryContent({
  job,
  query,
  jobs,
  repository,
  highlightRunnerId,
  onOpenRun,
  expanded,
  toggleJob,
  allJobs,
  messages,
}: {
  job: Parameters<typeof JobHistory>[0]['job'];
  query: ReturnType<typeof useJobHistory>['query'];
  jobs: JobSummary[];
  repository: Parameters<typeof JobHistory>[0]['repository'];
  highlightRunnerId: Parameters<typeof JobHistory>[0]['highlightRunnerId'];
  onOpenRun: Parameters<typeof JobHistory>[0]['onOpenRun'];
  expanded: number[];
  toggleJob: (id: number, open: boolean) => void;
  allJobs: JobSummary[];
  messages: string[];
}) {
  if (!job.workflow_id)
    return (
      <p className="panel-empty m-0 grid flex-1 place-items-center p-5 text-muted">
        GitHub has not reported the workflow identity needed to find this job's history.
      </p>
    );
  let emptyMessage = 'No history found for this job.';
  if (allJobs.length) {
    emptyMessage = 'No loaded jobs match this status. Load more history or change the filter.';
  }
  return (
    <>
      {!!query.error && (
        <p
          className={cn(
            'error-message m-0 mx-0 rounded-md border border-red-500/20 bg-red-500/4 px-3',
            'py-2.5 text-xs leading-normal wrap-anywhere whitespace-pre-wrap text-danger',
          )}
          role="alert"
        >
          {query.error.message}
        </p>
      )}
      {!!(query.isPending && !query.error) && <LoadingPlaceholder kind="history" />}
      {!!jobs.length && (
        <HistoryTable
          jobs={jobs}
          repository={repository}
          highlightRunnerId={highlightRunnerId}
          onOpenRun={onOpenRun}
          expanded={expanded}
          toggleJob={toggleJob}
        />
      )}
      {!!(!jobs.length && !query.isPending && !query.error) && (
        <p className="panel-empty m-0 grid flex-1 place-items-center p-5 text-muted">
          {emptyMessage}
        </p>
      )}
      {!!messages.length && (
        <details className="activity-data-notes mx-0 mt-2.5 max-w-225 text-xs text-muted">
          <summary className="cursor-pointer">Data coverage</summary>
          {messages.map((message) => (
            <p className="my-2 leading-relaxed" key={message}>
              {message}
            </p>
          ))}
        </details>
      )}
      {!!query.hasNextPage && (
        <button
          className="activity-load-more mx-auto my-3 flex text-xs"
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          <HistoryLoadMoreLabel query={query} />
        </button>
      )}
    </>
  );
}
