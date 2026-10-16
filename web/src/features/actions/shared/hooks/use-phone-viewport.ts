import { useSyncExternalStore } from 'react';

import { isPhoneViewport, phoneViewportQuery } from '../models/phone-viewport';

/** Nothing to unsubscribe when the window cannot report viewport changes. */
function unsubscribeNothing() {
  return undefined;
}

function subscribe(onChange: () => void) {
  if (typeof window.matchMedia !== 'function') return unsubscribeNothing;
  const query = window.matchMedia(phoneViewportQuery);
  // Some test doubles return a bare `{ matches }` object without listeners.
  if (typeof query.addEventListener !== 'function') return unsubscribeNothing;
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

/** Whether the window is phone-sized, following the viewport as it changes. */
export function usePhoneViewport() {
  return useSyncExternalStore(subscribe, isPhoneViewport, () => false);
}
