import { useEffect } from 'react';

import type { Job } from '../../../../../shared/api/types';
import { cn } from '../../../../../shared/lib/cn';
import { LoadingPlaceholder } from '../../../../../shared/ui/loading/components/LoadingPlaceholder';
import { useJob } from '../../../data/hooks/use-job';
import { JobWorkspaceDetail } from '../../../jobs/components/workspace/JobWorkspaceDetail';

export function SelectedJob({
  repository,
  jobId,
  stepNumber,
  highlightRunnerId,
  onOpenHistory,
  onLoaded,
  onSelectStep,
}: {
  repository: string;
  jobId: number;
  stepNumber?: number;
  highlightRunnerId?: number;
  onOpenHistory: (job: Job) => void;
  onLoaded: (job: Job) => void;
  onSelectStep: (number: number) => void;
}) {
  const query = useJob(repository, jobId);
  useEffect(() => {
    if (query.data) onLoaded(query.data);
  }, [query.data, onLoaded]);
  let placeholderKind: 'job' | 'step' = 'step';
  if (stepNumber === undefined) placeholderKind = 'job';
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
      {!!query.data && (
        <JobWorkspaceDetail
          job={query.data}
          repository={repository}
          selectedStepNumber={stepNumber}
          highlightRunnerId={highlightRunnerId}
          onOpenHistory={onOpenHistory}
          onSelectStep={onSelectStep}
        />
      )}
      {!!(!query.data && !query.error) && <LoadingPlaceholder kind={placeholderKind} />}
    </>
  );
}
