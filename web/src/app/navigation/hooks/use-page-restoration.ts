import { type QueryKey, useQueryClient } from '@tanstack/react-query';
import { useEffect, useLayoutEffect, useRef } from 'react';

import { navigationQueryKey, pageTransition } from '../models/app-navigation';
import { useNavigationStore } from '../stores/navigation-store';
import { useCurrentPage } from './use-current-page';

/** Restores scroll and cached page data when history moves; returns the scrolling element ref. */
export function usePageRestoration() {
  const client = useQueryClient();
  const page = useCurrentPage();
  const view = useNavigationStore((state) => state.preferences.view);
  const content = useRef<HTMLDivElement>(null);
  const scrollPositions = useRef(new Map<number, number>());
  const navigationCache = useRef(new Map<number, { key: QueryKey; data: unknown }>());

  // History changes notify synchronously, before React replaces the page being left.
  useEffect(
    () =>
      useNavigationStore.subscribe((state, previous) => {
        if (state.pages === previous.pages) return;
        const transition = pageTransition(previous.pages, state.pages);
        switch (transition.type) {
          case 'none':
            return;
          case 'reset':
            scrollPositions.current.clear();
            navigationCache.current.clear();
            return;
          case 'forward': {
            const { from } = transition;
            scrollPositions.current.set(from.key, content.current?.scrollTop ?? 0);
            const key = navigationQueryKey(from, previous.preferences);
            const data = client.getQueryData(key);
            if (data) navigationCache.current.set(from.key, { key, data });
            return;
          }
          case 'back': {
            const cached = navigationCache.current.get(transition.to.key);
            if (cached && !client.getQueryData(cached.key))
              client.setQueryData(cached.key, cached.data, { updatedAt: 0 });
            for (const discarded of transition.discarded) {
              navigationCache.current.delete(discarded.key);
              scrollPositions.current.delete(discarded.key);
            }
          }
        }
      }),
    [client],
  );

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
  }, [page.key, view]);

  return content;
}
