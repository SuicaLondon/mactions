import { cn } from '../../../../../../shared/lib/cn';
import { linkButtonClassName } from '../../../../../../shared/ui/controls/buttons/link-button-class';
import { PendingLabel } from '../../../../../../shared/ui/controls/buttons/PendingLabel';
import { useRunnerCreationStatus } from '../../../hooks/use-runner-creation-status';
import { useRunnerTargetDiscovery } from '../../../hooks/use-runner-target-discovery';

/** Retries a failed discovery, or loads the next page once the picker is browsed. */
export function TargetDiscoveryAction({ browsed }: { browsed: boolean }) {
  const { discovery } = useRunnerTargetDiscovery();
  const { pending: busy } = useRunnerCreationStatus();
  if (discovery.error) {
    return (
      <button
        type="button"
        className={cn(linkButtonClassName, 'shrink-0')}
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
  if (!browsed || !discovery.hasNextPage) return null;
  return (
    <button
      type="button"
      className={cn(linkButtonClassName, 'shrink-0')}
      disabled={discovery.isFetching || busy}
      onClick={() => void discovery.fetchNextPage()}
    >
      <PendingLabel pending={discovery.isFetching} idle="Load more" busy="Loading…" />
    </button>
  );
}
