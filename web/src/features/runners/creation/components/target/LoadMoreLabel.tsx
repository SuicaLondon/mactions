import { LoadingSpinner } from '../../../../../shared/ui/loading/components/LoadingSpinner';

export function LoadMoreLabel({ isFetching }: { isFetching: boolean }) {
  if (isFetching) return <LoadingSpinner label="Loading more targets…" />;
  return 'Load More Targets';
}
