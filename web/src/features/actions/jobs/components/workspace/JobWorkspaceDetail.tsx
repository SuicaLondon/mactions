import { useState } from 'react';

import type { Job } from '../../../../../shared/api/types';
import { jobRunnerName } from '../../../../../shared/lib/activity-format';
import { cn } from '../../../../../shared/lib/cn';
import { JobWorkspaceContent } from './JobWorkspaceContent';
import { JobWorkspaceHeader } from './JobWorkspaceHeader';

export function JobWorkspaceDetail({
  job,
  repository,
  selectedStepNumber,
  highlightRunnerId,
  onOpenHistory,
  onSelectStep,
}: {
  job: Job;
  repository: string;
  selectedStepNumber?: number;
  highlightRunnerId?: number;
  onOpenHistory: (job: Job) => void;
  onSelectStep: (number: number) => void;
}) {
  const [fullLog, setFullLog] = useState(false);
  const step = job.steps.find((item) => item.number === selectedStepNumber);
  const completed = job.steps.filter((item) => item.status === 'completed').length;
  const selectedRunner = highlightRunnerId !== undefined && job.runner_id === highlightRunnerId;
  let runnerType = 'Unknown type';
  if (job.host_type === 'self-hosted') runnerType = 'Self-hosted';
  else if (job.host_type === 'github-hosted') runnerType = 'GitHub-hosted';
  let device = 'Unknown device';
  if (job.device === 'this_device') device = 'This device';
  else if (job.device === 'other_device') device = 'Other device';
  let hosting = 'Not reported';
  if (job.runner_name || job.runner_id) hosting = `${runnerType} · ${device}`;
  else if (jobRunnerName(job) === 'Unassigned') hosting = 'Not assigned';
  return (
    <article
      className={cn(
        'job-workspace-detail px-4.5 pt-3 pb-4.5 max-lg:px-3.5 max-lg:pt-2.5 max-lg:pb-4',
        '@max-lg/job-detail:px-2.5 @max-lg/job-detail:pt-2.25 @max-lg/job-detail:pb-3.5',
        {
          'has-selected-step flex h-full min-h-75 flex-col': step,
        },
      )}
      aria-label={job.name}
    >
      <JobWorkspaceHeader
        job={job}
        step={step}
        fullLog={fullLog}
        setFullLog={setFullLog}
        onOpenHistory={onOpenHistory}
      />
      <JobWorkspaceContent
        step={step}
        job={job}
        repository={repository}
        completed={completed}
        selectedRunner={selectedRunner}
        hosting={hosting}
        fullLog={fullLog}
        onSelectStep={onSelectStep}
      />
    </article>
  );
}
