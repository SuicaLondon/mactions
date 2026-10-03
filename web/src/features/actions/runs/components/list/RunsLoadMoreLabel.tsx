import { LoadingSpinner } from '../../../../../shared/ui/loading/components/LoadingSpinner';
import { type useRuns } from '../../../data/hooks/use-runs';

export function RunsLoadMoreLabel({ query }: { query: ReturnType<typeof useRuns>['query'] }) {
  if (query.isFetchingNextPage) return <LoadingSpinner label="Loading more results…" />;
  return 'Load more runs';
}
