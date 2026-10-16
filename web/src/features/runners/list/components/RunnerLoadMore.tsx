import { PendingLabel } from '../../../../shared/ui/controls/buttons/PendingLabel';
import { LoadMoreError } from '../../../../shared/ui/feedback/components/LoadMoreError';

interface RunnerLoadMoreProps {
  /** GitHub has another inventory page. */
  hasMore: boolean;
  loading: boolean;
  /** The failed request for the next page, if the last one failed. */
  error: Error | null;
  onLoadMore: () => void;
}

export function RunnerLoadMore({ hasMore, loading, error, onLoadMore }: RunnerLoadMoreProps) {
  if (!hasMore) return null;
  return (
    <div className="mx-auto my-3 flex flex-col items-center gap-1.5">
      <button className="flex text-xs" disabled={loading} onClick={onLoadMore}>
        <PendingLabel pending={loading} idle="Load more runners" busy="Loading…" />
      </button>
      {/* Below the button, so a failed page never moves it. */}
      {!!error && <LoadMoreError error={error} subject="runners" />}
    </div>
  );
}
