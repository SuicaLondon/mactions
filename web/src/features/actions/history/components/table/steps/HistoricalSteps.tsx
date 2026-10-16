import { ErrorState } from '../../../../../../shared/ui/feedback/components/ErrorState';
import { UpdateFailedIndicator } from '../../../../../../shared/ui/feedback/components/UpdateFailedIndicator';
import { useJob } from '../../../../data/hooks/use-job';
import { HistoricalStepsContent } from './HistoricalStepsContent';
import { HistoricalStepsSkeleton } from './HistoricalStepsSkeleton';

export function HistoricalSteps({ repository, jobId }: { repository: string; jobId: number }) {
  const query = useJob(repository, jobId);
  const retry = () => void query.refetch();
  if (query.data) {
    return (
      <HistoricalStepsContent
        steps={query.data.steps}
        refreshIndicator={
          <UpdateFailedIndicator error={query.error} retrying={query.isFetching} onRetry={retry} />
        }
      />
    );
  }
  if (query.error) {
    return (
      <ErrorState
        title="Couldn't load step results"
        error={query.error}
        retrying={query.isFetching}
        onRetry={retry}
      />
    );
  }
  return <HistoricalStepsSkeleton />;
}
