import { LoadingSpinner } from '../../../../shared/ui/loading/components/LoadingSpinner';
import type { GitHubAuthState } from '../../types/github-auth';

export function AuthorizationButtonLabel({
  connect,
  authorizeLabel,
}: {
  connect: GitHubAuthState['connect'];
  authorizeLabel: 'Authorize GitHub again' | 'Start GitHub authorization';
}) {
  if (connect.isPending) return <LoadingSpinner label="Starting GitHub authorization…" />;
  return authorizeLabel;
}
