import { cn } from '../../../../shared/lib/cn';
import type { GitHubAuthState } from '../../types/github-auth';
import { AuthorizationButtonLabel } from './AuthorizationButtonLabel';

interface AuthorizationFormProps {
  welcome: boolean;
  organizationScope: boolean;
  setOrganizationScope: GitHubAuthState['setOrganizationScope'];
  connect: GitHubAuthState['connect'];
  authorizeLabel: 'Authorize GitHub again' | 'Start GitHub authorization';
}

export function AuthorizationForm({
  welcome,
  organizationScope,
  setOrganizationScope,
  connect,
  authorizeLabel,
}: AuthorizationFormProps) {
  return (
    <>
      <label
        className={cn(
          'checkbox-label mt-2 mr-2.5 mb-2 ml-0 inline-flex items-center gap-1.75 text-xs',
          { 'm-0 items-start leading-normal': welcome },
        )}
      >
        <input
          type="checkbox"
          checked={organizationScope}
          onChange={(event) => setOrganizationScope(event.target.checked)}
          className={cn('min-h-auto', { 'mt-0.5 shrink-0': welcome })}
        />
        Request organization runner management access
      </label>
      <button
        type="button"
        className="primary"
        disabled={connect.isPending}
        onClick={() => connect.mutate()}
      >
        <AuthorizationButtonLabel connect={connect} authorizeLabel={authorizeLabel} />
      </button>
    </>
  );
}
