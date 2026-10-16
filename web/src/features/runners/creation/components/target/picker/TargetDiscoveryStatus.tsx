import { InlineLoading } from '../../../../../../shared/ui/loading/components/InlineLoading';
import { targetCount, targetKindCopy } from '../../../../../github/models/target-options';
import { useRunnerTargetDiscovery } from '../../../hooks/use-runner-target-discovery';
import { useRunnerCreationStore } from '../../../stores/runner-creation-store';

/** Errors and first loads always show; counts and paging wait until the picker is browsed. */
export function TargetDiscoveryStatus({ browsed }: { browsed: boolean }) {
  const kind = useRunnerCreationStore((state) => state.kind);
  const { discovery, options } = useRunnerTargetDiscovery();
  if (discovery.error) {
    const detail = discovery.error.message.trim().replace(/\.+$/u, '');
    let message = 'Could not load targets. Check the GitHub connection, then retry.';
    if (detail) message = `Could not load targets: ${detail}. Check the connection, then retry.`;
    return <span className="max-h-11 min-w-0 overflow-y-auto text-danger">{message}</span>;
  }
  if (discovery.isPending) return <InlineLoading label="Loading your GitHub targets…" />;
  if (!browsed && options.length) return null;
  let status = `No ${targetKindCopy(kind).plural} found for this GitHub account.`;
  // Paging stays out of the copy: partial lists read as "Showing", complete lists as a count.
  if (discovery.hasNextPage) status = `Showing ${options.length}`;
  else if (options.length) status = targetCount(kind, options.length);
  return <span className="max-h-11 min-w-0 overflow-y-auto">{status}</span>;
}
