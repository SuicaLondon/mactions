import { type RefObject, useEffect, useRef } from 'react';

import { isPhoneViewport } from '../../shared/models/phone-viewport';

interface NodeBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Room left between the viewport edge and a revealed node. */
const margin = 24;

function revealOffset(start: number, size: number, scroll: number, visible: number) {
  if (start >= scroll && start + size <= scroll + visible) return scroll;
  return Math.max(0, start - margin);
}

function reveal(element: HTMLElement, target: NodeBox) {
  element.scrollLeft = revealOffset(
    target.x,
    target.width,
    element.scrollLeft,
    element.clientWidth,
  );
  element.scrollTop = revealOffset(
    target.y,
    target.height,
    element.scrollTop,
    element.clientHeight,
  );
}

/** Puts the root column at the left edge, whatever the restored scroll position was. */
function revealRoot(element: HTMLElement, root: NodeBox) {
  element.scrollLeft = Math.max(0, root.x - margin);
  element.scrollTop = revealOffset(root.y, root.height, element.scrollTop, element.clientHeight);
}

/**
 * Runs `measured` once the viewport has a width. A viewport that is not laid out
 * yet reports no width, so its scroll size says nothing about overflow.
 */
function whenMeasured(element: HTMLElement, measured: () => void) {
  if (element.clientWidth > 0 || typeof ResizeObserver === 'undefined') {
    measured();
    return undefined;
  }
  const observer = new ResizeObserver(() => {
    if (element.clientWidth === 0) return;
    observer.disconnect();
    measured();
  });
  observer.observe(element);
  return () => observer.disconnect();
}

/**
 * Scrolls the graph viewport once, on load. Wider viewports reveal the first failed
 * node; until a failure applies, a graph wider than its viewport starts with its root
 * column in view. Phones always start at the root column, once the viewport is
 * measured, and leave failures to the failure callout above the graph. Later layout
 * changes, such as expanding a matrix or jobs loading, leave the scroll position alone.
 */
export function useFirstFailureScroll(
  viewport: RefObject<HTMLDivElement | null>,
  target: NodeBox | undefined,
  root?: NodeBox,
) {
  const revealed = useRef(false);
  const rootRevealed = useRef(false);
  useEffect(() => {
    const element = viewport.current;
    if (revealed.current || !element) return;
    const phone = isPhoneViewport();
    if (target && !phone) {
      revealed.current = true;
      reveal(element, target);
      return;
    }
    if (rootRevealed.current || !root) return;
    return whenMeasured(element, () => {
      rootRevealed.current = true;
      // A failure that loads later must not pull a phone away from the root column.
      if (phone) revealed.current = true;
      if (element.scrollWidth <= element.clientWidth) return;
      revealRoot(element, root);
    });
  }, [viewport, target, root]);
}
