import { type QueryKey, useQueryClient } from '@tanstack/react-query';
import { useLayoutEffect, useRef } from 'react';

import { navigationQueryKey, type Page } from '../models/app-navigation';
import type { AppPreferences } from './use-app-preferences';

export function usePageRestoration(page: Page, preferences: AppPreferences) {
  const client = useQueryClient();
  const content = useRef<HTMLDivElement>(null);
  const scrollPositions = useRef(new Map<number, number>());
  const navigationCache = useRef(new Map<number, { key: QueryKey; data: unknown }>());

  useLayoutEffect(() => {
    const element = content.current;
    if (!element) return;
    const target = scrollPositions.current.get(page.key) ?? 0;
    element.scrollTop = target;
    if (!target || element.scrollHeight - element.clientHeight >= target) return;
    // A cached page may have expired. Restore once its requested rows arrive.
    const observer = new MutationObserver(() => {
      element.scrollTop = target;
      if (element.scrollHeight - element.clientHeight >= target) stop();
    });
    function stop() {
      observer.disconnect();
      element?.removeEventListener('wheel', stop);
      element?.removeEventListener('touchstart', stop);
      element?.removeEventListener('keydown', stop);
    }
    observer.observe(element, { childList: true, subtree: true });
    element.addEventListener('wheel', stop, { passive: true });
    element.addEventListener('touchstart', stop, { passive: true });
    element.addEventListener('keydown', stop);
    return stop;
  }, [page.key, preferences.view]);

  function savePage() {
    scrollPositions.current.set(page.key, content.current?.scrollTop ?? 0);
    const key = navigationQueryKey(page, preferences);
    const data = client.getQueryData(key);
    if (data) navigationCache.current.set(page.key, { key, data });
  }

  function restorePage(key: number) {
    const cached = navigationCache.current.get(key);
    if (cached && !client.getQueryData(cached.key))
      client.setQueryData(cached.key, cached.data, { updatedAt: 0 });
  }

  function discardPages(pages: Page[]) {
    for (const discarded of pages) {
      navigationCache.current.delete(discarded.key);
      scrollPositions.current.delete(discarded.key);
    }
  }

  function clear() {
    scrollPositions.current.clear();
    navigationCache.current.clear();
  }

  return { content, savePage, restorePage, discardPages, clear };
}
