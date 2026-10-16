import { type ReactNode, useState } from 'react';

import { type Job } from '../../../../../shared/api/types';
import { cn } from '../../../../../shared/lib/cn';
import { ranOnRunner } from '../../../shared/models/job-runner';
import { JobWorkspaceContent } from './JobWorkspaceContent';
import { JobWorkspaceHeader } from './JobWorkspaceHeader';

export function JobWorkspaceDetail({
  job,
  repository,
  selectedStepNumber,
  highlightRunnerId,
  refreshIndicator,
  onOpenHistory,
  onSelectStep,
}: {
  job: Job;
  repository: string;
  selectedStepNumber?: number;
  highlightRunnerId?: number;
  /** Shown in the header, such as a failed background refresh. */
  refreshIndicator?: ReactNode;
  onOpenHistory: (job: Job) => void;
  onSelectStep: (number: number) => void;
}) {
  const [fullLogOpen, setFullLogOpen] = useState(false);
  const step = job.steps.find((item) => item.number === selectedStepNumber);
  return (
    <article
      className={cn(
        'px-4.5 pt-3 pb-4.5 max-lg:px-3.5 max-lg:pt-2.5 max-lg:pb-4',
        '@max-lg/job-detail:px-2.5 @max-lg/job-detail:pt-2.25 @max-lg/job-detail:pb-3.5',
        {
          'flex h-full min-h-75 flex-col': step,
        },
      )}
      aria-label={job.name}
    >
      <JobWorkspaceHeader
        job={job}
        showingOverview={!step}
        fullLogOpen={fullLogOpen}
        refreshIndicator={refreshIndicator}
        onToggleFullLog={() => setFullLogOpen((value) => !value)}
        onOpenHistory={onOpenHistory}
      />
      <JobWorkspaceContent
        job={job}
        step={step}
        repository={repository}
        ranOnSelectedRunner={ranOnRunner(job, highlightRunnerId)}
        fullLogOpen={fullLogOpen}
        onSelectStep={onSelectStep}
      />
    </article>
  );
}
