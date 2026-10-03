import { useState } from 'react';

import { useConnection } from '../connection/use-connection';
import { useGitHubAuthorization } from './use-github-authorization';
export function useGitHubAuth(guide: boolean) {
  const connection = useConnection();
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [organizationScope, setOrganizationScope] = useState(false);
  const { auth, connect, cancel, checkAgain } = useGitHubAuthorization({
    organizationScope,
    onStarted: () => setExpanded(true),
    onCompleted: () => {
      setExpanded(false);
      setDismissed(false);
    },
  });
  const pending = auth.data?.status === 'pending';
  const needsConnection =
    connection.isSuccess && !connection.data.connected && connection.data.state !== 'unavailable';
  const showGuide = guide && needsConnection && !dismissed;
  const showContent = expanded || pending || showGuide;
  return {
    connection,
    expanded,
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
  };
}
