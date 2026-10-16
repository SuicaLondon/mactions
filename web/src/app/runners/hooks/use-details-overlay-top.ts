import { type RefObject, useLayoutEffect } from 'react';

/** Marks the element whose bottom edge (plus its bottom margin) is where the overlay starts. */
export const OVERLAY_ANCHOR_ATTRIBUTE = 'data-overlay-anchor';

function anchorOffset(workspace: HTMLElement): number | undefined {
  const anchor = workspace.querySelector<HTMLElement>(`[${OVERLAY_ANCHOR_ATTRIBUTE}]`);
  // A hidden anchor (phones hide the list behind the full-screen panel) has no boxes.
  if (!anchor || anchor.getClientRects().length === 0) return undefined;
  const margin = Number.parseFloat(getComputedStyle(anchor).marginBottom) || 0;
  const offset =
    anchor.getBoundingClientRect().bottom + margin - workspace.getBoundingClientRect().top;
  return Math.max(0, Math.round(offset));
}

/**
 * Below xl the runner details panel overlays the list. It starts below the list header, so
 * header actions such as Add runner and Refresh stay visible and clickable, and follows that
 * header as the page scrolls. Without an anchor the panel keeps its full height. The offset is
 * written to the panel's style directly so scrolling does not rerender React.
 */
export function useDetailsOverlayTop(
  panel: RefObject<HTMLElement | null>,
  open: boolean,
  /** Changes whenever the page content, and so the anchor, may have been replaced. */
  contentKey: string,
): void {
  useLayoutEffect(() => {
    const aside = panel.current;
    const workspace = aside?.parentElement;
    if (!open || !aside || !workspace) return;
    const measure = () => {
      const top = anchorOffset(workspace);
      if (top === undefined) {
        aside.style.removeProperty('top');
        aside.removeAttribute('data-anchored');
        return;
      }
      aside.style.top = `${top}px`;
      aside.setAttribute('data-anchored', '');
    };
    measure();
    workspace.addEventListener('scroll', measure, { capture: true, passive: true });
    let resize: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      resize = new ResizeObserver(measure);
      resize.observe(workspace);
    }
    return () => {
      workspace.removeEventListener('scroll', measure, { capture: true });
      resize?.disconnect();
      aside.style.removeProperty('top');
      aside.removeAttribute('data-anchored');
    };
  }, [panel, open, contentKey]);
}
