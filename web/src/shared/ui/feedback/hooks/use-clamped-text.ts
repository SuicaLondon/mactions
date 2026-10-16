import { type RefObject, useLayoutEffect, useState } from 'react';

/**
 * The element's full text while its line clamp hides part of it, otherwise null. Observers measure
 * it when it is first laid out, resized, or given new content.
 */
export function useClampedText(ref: RefObject<HTMLElement | null>) {
  const [text, setText] = useState<string | null>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const measure = () => {
      let next: string | null = null;
      if (element.scrollHeight > element.clientHeight + 1) {
        next = element.textContent?.trim() || null;
      }
      setText(next);
    };
    // A ResizeObserver reports the first layout too, so no separate initial measure is needed.
    const resize = new ResizeObserver(measure);
    resize.observe(element);
    const content = new MutationObserver(measure);
    content.observe(element, { childList: true, characterData: true, subtree: true });
    return () => {
      resize.disconnect();
      content.disconnect();
    };
  }, [ref]);
  return text;
}
