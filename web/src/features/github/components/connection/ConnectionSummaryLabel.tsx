import { InlineLoading } from '../../../../shared/ui/loading/components/InlineLoading';
import type { GitHubAuthState } from '../../types/github-auth';

export function ConnectionSummaryLabel({
  connection,
  summary,
}: {
  connection: GitHubAuthState['connection'];
  summary: string;
}) {
  if (connection.isPending) return <InlineLoading label="Checking GitHub connection…" />;
  return summary;
}
