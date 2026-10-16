import { useEffect } from 'react';

import { useConnection } from '../../../features/github/hooks/use-connection';
import { useWelcomeStore } from '../stores/welcome-store';

/** Persists the guide's dismissal once the GitHub connection is confirmed. */
export function useWelcomeDismissal() {
  const connected = Boolean(useConnection().data?.connected);
  const dismissed = useWelcomeStore((state) => state.dismissed);
  useEffect(() => {
    if (connected && !dismissed) useWelcomeStore.getState().rememberConnection();
  }, [connected, dismissed]);
}
