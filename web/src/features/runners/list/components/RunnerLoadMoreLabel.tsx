import { LoadingSpinner } from '../../../../shared/ui/loading/components/LoadingSpinner';
import { type useRunnerList } from '../hooks/use-runner-list';

export function RunnerLoadMoreLabel({
  inventory,
}: {
  inventory: ReturnType<typeof useRunnerList>['inventory'];
}) {
  if (inventory.query.isFetchingNextPage) return <LoadingSpinner label="Loading more results…" />;
  return 'Load more runners';
}
