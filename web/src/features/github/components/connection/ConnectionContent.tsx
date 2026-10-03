import { cn } from '../../../../shared/lib/cn';
import type { GitHubAuthState } from '../../types/github-auth';
import { AuthorizationContent } from '../authorization/AuthorizationContent';
import { ConnectionErrors } from './ConnectionErrors';
import { ConnectionGuide } from './guide/ConnectionGuide';

export function ConnectionContent({
  welcome,
  showGuide,
  connection,
  pending,
  organizationScope,
  setOrganizationScope,
  connect,
  authorizeLabel,
  auth,
  cancel,
  needsConnection,
  guide,
  setDismissed,
  setExpanded,
  onContinueLocal,
  onUseToken,
}: {
  welcome: boolean;
  showGuide: GitHubAuthState['showGuide'];
  connection: GitHubAuthState['connection'];
  pending: GitHubAuthState['pending'];
  organizationScope: GitHubAuthState['organizationScope'];
  setOrganizationScope: GitHubAuthState['setOrganizationScope'];
  connect: GitHubAuthState['connect'];
  authorizeLabel: 'Authorize GitHub again' | 'Start GitHub authorization';
  auth: GitHubAuthState['auth'];
  cancel: GitHubAuthState['cancel'];
  needsConnection: GitHubAuthState['needsConnection'];
  guide: boolean;
  setDismissed: GitHubAuthState['setDismissed'];
  setExpanded: GitHubAuthState['setExpanded'];
  onContinueLocal: (() => void) | undefined;
  onUseToken: (() => void) | undefined;
}) {
  let description =
    'mactions uses GitHub CLI (gh) on this Mac. Connect GitHub to choose repositories, register runners, and view jobs.';
  if (connection.data?.connected)
    description =
      'Uses the GitHub CLI account on this Mac. GitHub permissions are checked separately for each target.';
  return (
    <div
      className={cn('connection-content mx-0 mb-2 max-w-180 px-0 py-2 pb-0', {
        'flex flex-col items-start gap-3 pt-4': welcome,
      })}
    >
      {!!showGuide && (
        <h2
          className={cn('mt-1 text-base', {
            'm-0': welcome,
          })}
        >
          Connect GitHub to get started
        </h2>
      )}
      <p className="leading-relaxed">{description}</p>
      <AuthorizationContent
        pending={pending}
        welcome={welcome}
        organizationScope={organizationScope}
        setOrganizationScope={setOrganizationScope}
        connect={connect}
        authorizeLabel={authorizeLabel}
        auth={auth}
        cancel={cancel}
      />
      {!!(!pending && needsConnection) && (
        <ConnectionGuide
          welcome={welcome}
          guide={guide}
          onContinueLocal={() => {
            setDismissed(true);
            setExpanded(false);
            onContinueLocal?.();
          }}
          onUseToken={onUseToken}
        />
      )}
      <ConnectionErrors connection={connection} auth={auth} connect={connect} cancel={cancel} />
    </div>
  );
}
