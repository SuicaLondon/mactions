import { ErrorState } from '../../../shared/ui/feedback/components/ErrorState';
import { SkeletonLine } from '../../../shared/ui/loading/components/SkeletonLine';
import { useManagerSettingsQuery } from '../hooks/use-manager-settings-query';
import { ManagerNetworkSettings } from './ManagerNetworkSettings';

interface ManagerSettingsContentProps {
  /** Locks the form while an update runs. */
  disabled: boolean;
  restartStalled: boolean;
}

export function ManagerSettingsContent({ disabled, restartStalled }: ManagerSettingsContentProps) {
  const query = useManagerSettingsQuery();
  // Loading and first-load failure hold the network form's height, so the dialog never jumps.
  if (query.isPending) {
    return (
      <div
        role="status"
        aria-label="Loading manager settings"
        aria-busy="true"
        className="mt-4 flex min-h-66 animate-pulse flex-col gap-3 motion-reduce:animate-none"
      >
        <SkeletonLine className="w-28" />
        <SkeletonLine className="w-full" />
        <SkeletonLine className="w-4/5" />
        <SkeletonLine className="mt-2 h-8 w-full" />
        <SkeletonLine className="w-3/5" />
        <SkeletonLine className="mt-2 h-7 w-36" />
      </div>
    );
  }
  if (!query.data) {
    let error = query.error;
    if (!error) error = new Error('The manager did not return its settings.');
    return (
      <ErrorState
        className="mt-4 min-h-66"
        title="Could not load settings"
        error={
          new Error(
            `${error.message.trim().replace(/\.+$/u, '')}. Check that mactions is running on the Mac, then retry.`,
          )
        }
        retrying={query.isFetching}
        onRetry={() => void query.refetch()}
      />
    );
  }
  return (
    <ManagerNetworkSettings data={query.data} disabled={disabled} restartStalled={restartStalled} />
  );
}
