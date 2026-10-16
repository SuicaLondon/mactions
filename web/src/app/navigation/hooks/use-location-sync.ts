import { useEffect } from 'react';

import { pageLocation, parseLocation } from '../models/page-location';
import { useNavigationStore } from '../stores/navigation-store';

const MAX_ENTRIES = 50;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function stateRecord() {
  const state: unknown = window.history.state;
  if (isRecord(state)) return state;
  return {};
}

/** The app's URLs leading to the current browser entry, so in-app Back can return to them. */
function entries(): string[] {
  const saved = stateRecord().mactions;
  const hash = window.location.hash;
  if (Array.isArray(saved) && saved.every((url) => typeof url === 'string')) {
    if (saved.at(-1) === hash) return saved;
  }
  return [hash];
}

function currentLocation() {
  const { pages, preferences } = useNavigationStore.getState();
  return pageLocation(pages, preferences.view);
}

function replace(next: string) {
  const urls = [...entries().slice(0, -1), next];
  window.history.replaceState({ ...stateRecord(), mactions: urls }, '', next);
}

/** Pops back to an earlier entry that shows the same page, or pushes a new entry. */
function write(next: string) {
  const urls = entries();
  const index = urls.length - 1;
  if (urls[index] === next) return;
  let previous = -1;
  if (index > 0) previous = urls.lastIndexOf(next, index - 1);
  if (previous >= 0) {
    window.history.go(previous - index);
    return;
  }
  const state = { ...stateRecord(), mactions: [...urls, next].slice(-MAX_ENTRIES) };
  window.history.pushState(state, '', next);
}

/**
 * Keeps the URL hash in step with the page stack: in-app navigation pushes or pops browser entries,
 * and browser Back, Forward, or an edited URL moves the app to the page it names.
 */
export function useLocationSync() {
  useEffect(() => {
    let applying = false;
    const unsubscribe = useNavigationStore.subscribe((state, previous) => {
      if (applying) return;
      if (state.pages === previous.pages && state.preferences.view === previous.preferences.view)
        return;
      write(pageLocation(state.pages, state.preferences.view));
    });
    function follow() {
      applying = true;
      try {
        useNavigationStore.getState().applyLocation(parseLocation(window.location.hash));
      } finally {
        applying = false;
      }
      replace(currentLocation());
    }
    replace(currentLocation());
    window.addEventListener('popstate', follow);
    window.addEventListener('hashchange', follow);
    return () => {
      unsubscribe();
      window.removeEventListener('popstate', follow);
      window.removeEventListener('hashchange', follow);
    };
  }, []);
}
