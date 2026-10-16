import type { Job } from '../../../../../../shared/api/types';
import { jobRunnerName } from '../../../../../../shared/lib/activity-format';
import { cn } from '../../../../../../shared/lib/cn';
import { Timestamp } from '../../../../shared/components/Timestamp';
import { jobHostingLabel } from '../../../models/job-hosting';

export function JobMetadata({
  job,
  ranOnSelectedRunner,
}: {
  job: Job;
  /** The job ran on the runner the page is showing. */
  ranOnSelectedRunner: boolean;
}) {
  return (
    <dl
      className={cn(
        'mx-0 mt-1 mb-3 grid grid-cols-2 gap-x-6 gap-y-2.25 border-t',
        'border-t-line px-0 pt-2.5 pb-0 text-xs max-lg:gap-x-3.5 max-lg:gap-y-1.25',
        '@max-lg/job-detail:grid-cols-1',
      )}
    >
      <div className="flex min-w-0 items-baseline gap-1.75">
        <dt className="w-14 shrink-0 text-muted">Runner</dt>
        <dd className="m-0 min-w-0 leading-normal wrap-anywhere">
          {jobRunnerName(job)}
          {!!ranOnSelectedRunner && (
            <span
              className={cn(
                'ml-1.5 rounded-sm bg-accent/10 px-1 text-xs',
                'whitespace-nowrap text-accent',
              )}
            >
              Selected runner
            </span>
          )}
        </dd>
      </div>
      <div className="flex min-w-0 items-baseline gap-1.75">
        <dt className="w-14 shrink-0 text-muted">Hosting</dt>
        <dd className="m-0 min-w-0 leading-normal wrap-anywhere">{jobHostingLabel(job)}</dd>
      </div>
      <div className="flex min-w-0 items-baseline gap-1.75">
        <dt className="w-14 shrink-0 text-muted">Started</dt>
        <dd className="m-0 min-w-0 leading-normal wrap-anywhere">
          <Timestamp value={job.started_at} format="time" />
        </dd>
      </div>
      <div className="flex min-w-0 items-baseline gap-1.75">
        <dt className="w-14 shrink-0 text-muted">Finished</dt>
        <dd className="m-0 min-w-0 leading-normal wrap-anywhere">
          <Timestamp value={job.completed_at} format="time" />
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
