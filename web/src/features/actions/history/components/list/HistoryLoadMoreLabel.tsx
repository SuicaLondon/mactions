import { LoadingSpinner } from '../../../../../shared/ui/loading/components/LoadingSpinner';
import { type JobHistoryContent } from './JobHistoryContent';

export function HistoryLoadMoreLabel({
  query,
}: {
  query: Parameters<typeof JobHistoryContent>[0]['query'];
}) {
  if (query.isFetchingNextPage) return <LoadingSpinner label="Loading more results…" />;
  return 'Load more history';
}
