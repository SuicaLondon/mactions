import { InlineLoading } from '../../../../../shared/ui/loading/components/InlineLoading';
import { useRunnerCreationContext } from '../../hooks/use-runner-creation-context';

export function TargetDiscoveryStatus() {
  const { discovery, options } = useRunnerCreationContext();
  if (discovery.error) {
    return (
      <span className="max-h-11 min-w-0 overflow-y-auto">
        Could not load targets. Please retry.
      </span>
    );
  }
  if (discovery.isPending) return <InlineLoading label="Loading your GitHub targets…" />;
  let status = 'No targets found for this GitHub account.';
  if (options.length) status = `${options.length} targets loaded`;
  return <span className="max-h-11 min-w-0 overflow-y-auto">{status}</span>;
}
