import type { JobStep } from '../../../../../shared/api/types';
import { JobLogs } from '../logs/JobLogs';
import { type JobWorkspaceDetail } from './JobWorkspaceDetail';
import { JobMetadata } from './overview/JobMetadata';
import { JobOverviewSteps } from './overview/JobOverviewSteps';
import { JobOverviewSummary } from './overview/JobOverviewSummary';
import { WorkspaceStep } from './WorkspaceStep';

export function JobWorkspaceContent({
  step,
  job,
  repository,
  completed,
  selectedRunner,
  hosting,
  fullLog,
  onSelectStep,
}: {
  step: JobStep | undefined;
  job: Parameters<typeof JobWorkspaceDetail>[0]['job'];
  repository: Parameters<typeof JobWorkspaceDetail>[0]['repository'];
  completed: number;
  selectedRunner: boolean;
  hosting: string;
  fullLog: boolean;
  onSelectStep: Parameters<typeof JobWorkspaceDetail>[0]['onSelectStep'];
}) {
  if (step)
    return <WorkspaceStep key={step.number} job={job} step={step} repository={repository} />;
  return (
    <>
      <JobOverviewSummary job={job} completed={completed} />
      <JobMetadata job={job} selectedRunner={selectedRunner} hosting={hosting} />
      {!!fullLog && (
        <section id={`job-${job.id}-full-log`} aria-label="Full job output">
          <JobLogs job={job} repository={repository} />
        </section>
      )}
      <JobOverviewSteps job={job} onSelectStep={onSelectStep} />
    </>
  );
}
