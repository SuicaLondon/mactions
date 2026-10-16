import { useEffect } from 'react';

import type { Job } from '../../../../../shared/api/types';
import { ErrorState } from '../../../../../shared/ui/feedback/components/ErrorState';
import { UpdateFailedIndicator } from '../../../../../shared/ui/feedback/components/UpdateFailedIndicator';
import { useJob } from '../../../data/hooks/use-job';
import { JobWorkspaceDetail } from '../../../jobs/components/workspace/JobWorkspaceDetail';
import { JobOverviewSkeleton } from '../../../jobs/components/workspace/overview/JobOverviewSkeleton';
import { StepOutputSkeleton } from '../../../jobs/components/workspace/StepOutputSkeleton';
import type { JobSelection } from '../../../jobs/types/job-selection';

export function SelectedJob({
  repository,
  selection,
  highlightRunnerId,
  onOpenHistory,
  onLoaded,
  onSelect,
}: {
  repository: string;
  selection: JobSelection;
  highlightRunnerId?: number;
  onOpenHistory: (job: Job) => void;
  /** Receives the loaded Job so the Job tree can list its steps. */
  onLoaded: (job: Job) => void;
  onSelect: (selection: JobSelection) => void;
}) {
  const { jobId, stepNumber } = selection;
  const query = useJob(repository, jobId);
  useEffect(() => {
    if (query.data) onLoaded(query.data);
  }, [query.data, onLoaded]);
  const retry = () => void query.refetch();
  if (query.data) {
    return (
      <JobWorkspaceDetail
        job={query.data}
        repository={repository}
        selectedStepNumber={stepNumber}
        highlightRunnerId={highlightRunnerId}
        onOpenHistory={onOpenHistory}
        onSelectStep={(number) => onSelect({ jobId, stepNumber: number })}
        refreshIndicator={
          <UpdateFailedIndicator error={query.error} retrying={query.isFetching} onRetry={retry} />
        }
      />
    );
  }
  if (query.error) {
    return (
      <ErrorState
        className="h-full"
        title="Couldn't load this job"
        error={query.error}
        retrying={query.isFetching}
        onRetry={retry}
      />
    );
  }
  // The skeleton mirrors what loads: the overview, or with a step selected, that step's output.
  if (stepNumber === undefined) return <JobOverviewSkeleton />;
  return <StepOutputSkeleton />;
}
