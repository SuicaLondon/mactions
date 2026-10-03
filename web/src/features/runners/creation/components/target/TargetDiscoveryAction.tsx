import { useRunnerCreationContext } from '../../hooks/use-runner-creation-context';
import { LoadMoreLabel } from './LoadMoreLabel';

export function TargetDiscoveryAction() {
  const { discovery, busy } = useRunnerCreationContext();
  if (discovery.error) {
    return (
      <button
        type="button"
        className="min-h-5.5 shrink-0 border-0 bg-transparent p-0 text-xs text-accent shadow-none"
        disabled={discovery.isFetching || busy}
        onClick={() => {
          if (discovery.isFetchNextPageError) void discovery.fetchNextPage();
          else void discovery.refetch();
        }}
      >
        Retry
      </button>
    );
  }
  if (!discovery.hasNextPage) return null;
  return (
    <button
      type="button"
      className="min-h-5.5 shrink-0 border-0 bg-transparent p-0 text-xs text-accent shadow-none"
      disabled={discovery.isFetching || busy}
      onClick={() => void discovery.fetchNextPage()}
    >
      <LoadMoreLabel isFetching={discovery.isFetching} />
    </button>
  );
}
