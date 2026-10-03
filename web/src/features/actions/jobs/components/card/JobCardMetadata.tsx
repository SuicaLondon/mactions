import { cn } from '../../../../../shared/lib/cn';
import { BranchIcon } from '../../../../../shared/ui/icons/git/BranchIcon';
import { ExternalLinkIcon } from '../../../../../shared/ui/icons/navigation/ExternalLinkIcon';
import { CardTimestamp } from './CardTimestamp';
import { type JobCard } from './JobCard';

export function JobCardMetadata({
  job,
  details,
}: {
  job: Parameters<typeof JobCard>[0]['job'];
  details: (string | null | undefined)[][];
}) {
  return (
    <div className="job-detail-meta px-4 pt-0 pb-4">
      {!!job.run_title && (
        <p className="job-run-title mx-0 mt-0 mb-3 text-xs leading-normal wrap-anywhere">
          {job.run_title}
        </p>
      )}
      <div
        className={cn(
          'job-revision flex flex-wrap items-baseline gap-x-3 gap-y-2 px-1.25 pb-4 text-xs',
          'text-muted',
        )}
      >
        <span className="flex min-w-0 items-center gap-1.25 wrap-anywhere">
          <BranchIcon className="size-3.25" />
          {job.branch || 'Unknown branch'}
        </span>
        {!!job.head_sha && (
          <code
            className="rounded-sm bg-canvas py-0.5 text-xs text-foreground"
            title={job.head_sha}
          >
            {job.head_sha.slice(0, 7)}
          </code>
        )}
        {!!job.commit_message && (
          <span
            className="job-commit min-w-0 overflow-hidden text-ellipsis whitespace-nowrap"
            title={job.commit_message}
          >
            {job.commit_message.split('\n')[0]}
          </span>
        )}
      </div>
      <dl
        className={cn(
          'job-detail-grid grid grid-cols-[repeat(auto-fit,_minmax(--spacing(36.25),_1fr))]',
          'gap-x-4.5 gap-y-3.5 border-t border-t-line px-0 py-3.5 max-sm:grid-cols-2',
        )}
      >
        {details
          .filter(([, value]) => value)
          .map(([label, value]) => (
            <div key={label}>
              <dt className="mb-1.25 text-xs">{label}</dt>
              <dd className="text-xs tabular-nums">{value}</dd>
            </div>
          ))}
        <div>
          <dt className="mb-1.25 text-xs">Started</dt>
          <dd className="text-xs tabular-nums">
            <CardTimestamp value={job.started_at} />
          </dd>
        </div>
        <div>
          <dt className="mb-1.25 text-xs">Finished</dt>
          <dd className="text-xs tabular-nums">
            <CardTimestamp value={job.completed_at} />
          </dd>
        </div>
        {!!job.created_at && (
          <div>
            <dt className="mb-1.25 text-xs">Created</dt>
            <dd className="text-xs tabular-nums">
              <CardTimestamp value={job.created_at} />
            </dd>
          </div>
        )}
      </dl>
      {!!job.labels?.length && (
        <div className="job-runner-labels flex flex-wrap items-center gap-1.25 px-0 pt-0 pb-3">
          <span className="mr-1.25 text-xs text-muted">Runs on</span>
          {job.labels.map((label) => (
            <span
              key={label}
              className={cn(
                'label inline-flex max-w-full items-center gap-1 rounded-md border border-line',
                'bg-surface px-1.5 py-0.75 text-xs wrap-anywhere',
              )}
            >
              {label}
            </span>
          ))}
        </div>
      )}
      <div
        className={cn(
          'job-detail-links flex flex-wrap items-center gap-x-3.5 gap-y-2 text-xs',
          'text-muted',
        )}
      >
        {!!job.run_url && (
          <a
            className={cn(
              'inline-flex min-w-0 items-center gap-1 wrap-anywhere no-underline',
              'hover:underline',
            )}
            href={job.run_url}
            target="_blank"
            rel="noreferrer"
          >
            Workflow run
            <ExternalLinkIcon className="size-2.75" />
          </a>
        )}
        {!!job.workflow_url && (
          <a
            className={cn(
              'inline-flex min-w-0 items-center gap-1 wrap-anywhere no-underline',
              'hover:underline',
            )}
            href={job.workflow_url}
            target="_blank"
            rel="noreferrer"
          >
            {job.workflow_path || 'Workflow file'}
            <ExternalLinkIcon className="size-2.75" />
          </a>
        )}
        <span className="ml-auto tabular-nums">Job #{job.id}</span>
      </div>
    </div>
  );
}
