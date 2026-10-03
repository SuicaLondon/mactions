import { InlineLoading } from '../../../../shared/ui/loading/components/InlineLoading';
import type { useConnection } from '../../hooks/connection/use-connection';

export function GitHubStatusContent({
  connection,
  label,
}: {
  connection: ReturnType<typeof useConnection>;
  label: string;
}) {
  if (connection.isPending)
    return <InlineLoading label="Checking GitHub connection…" className="h-4 w-39" />;
  return label;
}
