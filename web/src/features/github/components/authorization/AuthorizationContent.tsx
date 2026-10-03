import type { GitHubAuthState } from '../../types/github-auth';
import { AuthorizationDeviceFlow } from './AuthorizationDeviceFlow';
import { AuthorizationForm } from './AuthorizationForm';

interface AuthorizationContentProps {
  pending: boolean;
  welcome: boolean;
  organizationScope: boolean;
  setOrganizationScope: GitHubAuthState['setOrganizationScope'];
  connect: GitHubAuthState['connect'];
  authorizeLabel: 'Authorize GitHub again' | 'Start GitHub authorization';
  auth: GitHubAuthState['auth'];
  cancel: GitHubAuthState['cancel'];
}

export function AuthorizationContent({
  pending,
  welcome,
  organizationScope,
  setOrganizationScope,
  connect,
  authorizeLabel,
  auth,
  cancel,
}: AuthorizationContentProps) {
  if (pending) return <AuthorizationDeviceFlow welcome={welcome} auth={auth} cancel={cancel} />;
  return (
    <AuthorizationForm
      welcome={welcome}
      organizationScope={organizationScope}
      setOrganizationScope={setOrganizationScope}
      connect={connect}
      authorizeLabel={authorizeLabel}
    />
  );
}
