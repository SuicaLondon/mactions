import { cn } from '../../../../../shared/lib/cn';
import { LoadingPlaceholder } from '../../../../../shared/ui/loading/components/LoadingPlaceholder';
import { useJob } from '../../../data/hooks/use-job';
import { HistoricalStepsContent } from './HistoricalStepsContent';

export function HistoricalSteps({ repository, jobId }: { repository: string; jobId: number }) {
  const query = useJob(repository, jobId);
  const error = query.error && (
    <p
      className={cn(
        'error-message m-0 mx-0 rounded-md border border-red-500/20 bg-red-500/4 px-3',
        'py-2.5 text-xs leading-normal wrap-anywhere whitespace-pre-wrap text-danger',
      )}
      role="alert"
    >
      {query.error.message}
    </p>
  );
  if (!query.data)
    return error ?? <LoadingPlaceholder kind="history-steps" label="Loading historical steps…" />;
  return (
    <>
      {error}
      <HistoricalStepsContent steps={query.data.steps} />
    </>
  );
}
