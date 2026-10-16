const WELCOME_KEY = 'mactions.welcome.v1';

export function readWelcomeDismissed() {
  try {
    return localStorage.getItem(WELCOME_KEY) === 'seen';
  } catch {
    return false;
  }
}

export function rememberWelcomeDismissed() {
  try {
    localStorage.setItem(WELCOME_KEY, 'seen');
  } catch {
    /* Continue without browser storage. */
  }
}
