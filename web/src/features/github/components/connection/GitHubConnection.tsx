import { cn } from '../../../../shared/lib/cn';
import { useGitHubAuth } from '../../hooks/authorization/use-github-auth';
import { ConnectionContent } from './ConnectionContent';
import { ConnectionSummary } from './ConnectionSummary';

export function GitHubConnection({
  guide = false,
  welcome = false,
  onUseToken,
  onContinueLocal,
}: {
  guide?: boolean;
  welcome?: boolean;
  onUseToken?: () => void;
  onContinueLocal?: () => void;
}) {
  const {
    connection,
    setExpanded,
    setDismissed,
    organizationScope,
    setOrganizationScope,
    auth,
    connect,
    cancel,
    pending,
    needsConnection,
    showGuide,
    showContent,
    checkAgain,
  } = useGitHubAuth(guide);
  let summary = 'GitHub connection needs attention';
  if (connection.data?.connected) summary = `Connected as @${connection.data.login}`;
  else if (connection.isError) summary = 'Unable to check GitHub connection';
  let settingsLabel: 'Connection settings' | 'Connect GitHub' = 'Connect GitHub';
  let authorizeLabel: 'Authorize GitHub again' | 'Start GitHub authorization' =
    'Start GitHub authorization';
  if (connection.data?.connected) {
    settingsLabel = 'Connection settings';
    authorizeLabel = 'Authorize GitHub again';
  }
  return (
    <section
      className={cn(
        'github-connection border-b border-b-line bg-toolbar px-5.5 py-2.25 text-xs',
        'max-md:py-2.25',
        {
          'rounded-lg border border-line bg-surface p-4': welcome,
        },
      )}
      aria-label="GitHub connection"
    >
      <ConnectionSummary
        welcome={welcome}
        connection={connection}
        summary={summary}
        setExpanded={setExpanded}
        showContent={showContent}
        setDismissed={setDismissed}
        settingsLabel={settingsLabel}
        checkAgain={checkAgain}
      />
      {!!showContent && (
        <ConnectionContent
          welcome={welcome}
          showGuide={showGuide}
          connection={connection}
          pending={pending}
          organizationScope={organizationScope}
          setOrganizationScope={setOrganizationScope}
          connect={connect}
          authorizeLabel={authorizeLabel}
          auth={auth}
          cancel={cancel}
          needsConnection={needsConnection}
          guide={guide}
          setDismissed={setDismissed}
          setExpanded={setExpanded}
          onContinueLocal={onContinueLocal}
          onUseToken={onUseToken}
        />
      )}
    </section>
  );
}
