import { useEffect } from 'react';

import type { Page } from '../models/app-navigation';
import { type PageLocation, pageLocation, parseLocation } from '../models/page-location';
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

/**
 * The page stack saved with the current browser entry. A URL names only the page, not how it
 * was reached, so Forward restores ancestry such as a History page from this instead.
 */
function savedLocation(hash: string): PageLocation | null {
  const saved = stateRecord().mactionsPages;
  if (!isRecord(saved) || !Array.isArray(saved.pages)) return null;
  const { view } = saved;
  if (view !== 'runners' && view !== 'runs') return null;
  // The pages were saved by this app; an entry from another version must still name this URL.
  const pages = saved.pages as Page[];
  try {
    if (pageLocation(pages, view) !== hash) return null;
  } catch {
    return null;
  }
  return { view, pages };
}

function current() {
  const { pages, preferences } = useNavigationStore.getState();
  return {
    url: pageLocation(pages, preferences.view),
    saved: { view: preferences.view, pages },
  };
}

/** Saves the current pages in the current browser entry, under the URL they name. */
function replace() {
  const { url, saved } = current();
  const urls = [...entries().slice(0, -1), url];
  window.history.replaceState({ ...stateRecord(), mactions: urls, mactionsPages: saved }, '', url);
}

/**
 * Opening a page pushes a browser entry, even when its URL was visited before. Back, breadcrumbs,
 * and selections within a page return to an earlier entry that shows the same page when there is
 * one, so browser Back and Forward follow the same pages.
 */
function write(opened: boolean) {
  const { url, saved } = current();
  const urls = entries();
  const index = urls.length - 1;
  if (urls[index] === url) {
    replace();
    return;
  }
  let previous = -1;
  if (!opened && index > 0) previous = urls.lastIndexOf(url, index - 1);
  if (previous >= 0) {
    window.history.go(previous - index);
    return;
  }
  const state = {
    ...stateRecord(),
    mactions: [...urls, url].slice(-MAX_ENTRIES),
    mactionsPages: saved,
  };
  window.history.pushState(state, '', url);
}

/** A page that was not in the stack before is now on top: the user opened it. */
function openedPage(previous: Page[], pages: Page[]) {
  const top = pages.at(-1)?.key;
  return !previous.some((page) => page.key === top);
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
      write(openedPage(previous.pages, state.pages));
    });
    function follow() {
      applying = true;
      try {
        const hash = window.location.hash;
        useNavigationStore.getState().applyLocation(savedLocation(hash) ?? parseLocation(hash));
      } finally {
        applying = false;
      }
      replace();
    }
    replace();
    window.addEventListener('popstate', follow);
    window.addEventListener('hashchange', follow);
    return () => {
      unsubscribe();
      window.removeEventListener('popstate', follow);
      window.removeEventListener('hashchange', follow);
    };
  }, []);
}
