import { useEffect, useState } from 'react';

const WELCOME_KEY = 'mactions.welcome.v1';

function readDismissed() {
  try {
    return localStorage.getItem(WELCOME_KEY) === 'seen';
  } catch {
    return false;
  }
}

function rememberDismissal() {
  try {
    localStorage.setItem(WELCOME_KEY, 'seen');
  } catch {
    /* Continue without browser storage. */
  }
}

export function useWelcome(connected: boolean, disconnected: boolean) {
  const [welcomeDismissed, setWelcomeDismissed] = useState(readDismissed);
  const [setupOpen, setSetupOpen] = useState(false);
  useEffect(() => {
    if (connected && !welcomeDismissed) {
      rememberDismissal();
      // eslint-disable-next-line react-x/set-state-in-effect -- Persist connection-driven dismissal after the GitHub query resolves.
      setWelcomeDismissed(true);
    }
  }, [connected, welcomeDismissed]);

  function dismissWelcome() {
    rememberDismissal();
    setWelcomeDismissed(true);
    setSetupOpen(false);
  }

  return {
    welcome: setupOpen || (!welcomeDismissed && disconnected),
    setSetupOpen,
    dismissWelcome,
  };
}
