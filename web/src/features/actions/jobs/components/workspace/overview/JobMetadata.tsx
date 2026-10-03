import { jobRunnerName } from '../../../../../../shared/lib/activity-format';
import { cn } from '../../../../../../shared/lib/cn';
import { type JobWorkspaceDetail } from '../JobWorkspaceDetail';
import { WorkspaceTimestamp } from '../WorkspaceTimestamp';

export function JobMetadata({
  job,
  selectedRunner,
  hosting,
}: {
  job: Parameters<typeof JobWorkspaceDetail>[0]['job'];
  selectedRunner: boolean;
  hosting: string;
}) {
  return (
    <dl
      className={cn(
        'job-workspace-meta mx-0 mt-1 mb-3 grid grid-cols-2 gap-x-6 gap-y-2.25 border-t',
        'border-t-line px-0 pt-2.5 pb-0 text-xs max-lg:gap-x-3.5 max-lg:gap-y-1.25',
        '@max-lg/job-detail:grid-cols-1',
      )}
    >
      <div className="flex min-w-0 items-baseline gap-1.75">
        <dt className="w-14 shrink-0 text-muted">Runner</dt>
        <dd className="m-0 min-w-0 leading-normal wrap-anywhere">
          {jobRunnerName(job)}
          {!!selectedRunner && (
            <span
              className={cn(
                'selected-runner-mark ml-1.5 border-l-2 border-l-accent pl-1.25 text-xs',
                'whitespace-nowrap text-muted',
              )}
            >
              Selected runner
            </span>
          )}
        </dd>
      </div>
      <div className="flex min-w-0 items-baseline gap-1.75">
        <dt className="w-14 shrink-0 text-muted">Hosting</dt>
        <dd className="m-0 min-w-0 leading-normal wrap-anywhere">{hosting}</dd>
      </div>
      <div className="flex min-w-0 items-baseline gap-1.75">
        <dt className="w-14 shrink-0 text-muted">Started</dt>
        <dd className="m-0 min-w-0 leading-normal wrap-anywhere">
          <WorkspaceTimestamp value={job.started_at} compact />
        </dd>
      </div>
      <div className="flex min-w-0 items-baseline gap-1.75">
        <dt className="w-14 shrink-0 text-muted">Finished</dt>
        <dd className="m-0 min-w-0 leading-normal wrap-anywhere">
          <WorkspaceTimestamp value={job.completed_at} compact />
        </dd>
      </div>
      {!!job.labels?.length && (
        <div className="flex min-w-0 items-baseline gap-1.75">
          <dt className="w-14 shrink-0 text-muted">Runs on</dt>
          <dd className="m-0 min-w-0 leading-normal wrap-anywhere">{job.labels.join(', ')}</dd>
        </div>
      )}
    </dl>
  );
}
