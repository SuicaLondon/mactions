import { type Job } from '../../../../../../shared/api/types';
import { duration } from '../../../../../../shared/lib/activity-format';
import { cn } from '../../../../../../shared/lib/cn';
import { Status } from '../../../../shared/components/Status';
import { jobProgress } from '../../../models/job-progress';
import { JobOverviewProgressLabel } from './JobOverviewProgressLabel';

const progressClasses: Record<string, string> = {
  success: 'bg-activity-success',
  failure: 'bg-danger',
  running: 'bg-accent',
  queued: 'bg-muted',
  neutral: 'bg-muted',
};

export function JobOverviewSummary({
  job,
  onSelectStep,
}: {
  job: Job;
  onSelectStep: (number: number) => void;
}) {
  const { label, outcome, value, max, tone, failedStep } = jobProgress(job);
  return (
    <div
      className={cn(
        'flex min-h-10.25 flex-wrap items-center gap-3 px-0 py-1.75',
        'text-xs text-muted @max-lg/job-detail:flex-wrap @max-lg/job-detail:gap-1.75',
      )}
    >
      <Status status={job.status} conclusion={job.conclusion} />
      <span className="whitespace-nowrap tabular-nums">
        {duration(job.started_at, job.completed_at, job.status === 'in_progress')}
      </span>
      <div
        className={cn(
          'ml-auto grid min-w-0 gap-2 text-right text-xs',
          'whitespace-nowrap',
          'tabular-nums @max-lg/job-detail:min-w-26.25 @max-lg/job-detail:flex-1',
        )}
      >
        <JobOverviewProgressLabel
          label={label}
          failedStep={failedStep}
          onSelectStep={onSelectStep}
        />
        <div
          className={cn(
            'h-1.5 w-37.5 max-w-full justify-self-end overflow-hidden rounded-full',
            'bg-line',
          )}
          role="progressbar"
          aria-label={outcome}
          aria-valuemin={0}
          aria-valuenow={value}
          aria-valuemax={max}
        >
          <span
            className={cn('block h-full rounded-full', progressClasses[tone])}
            style={{ width: `${(value / max) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
