const VIEWPORT_MARGIN = 8;
const ANCHOR_GAP = 4;

/** Places an open popover just below its trigger, kept inside the viewport. */
export function placeNear(trigger: HTMLElement | null, popover: HTMLElement) {
  if (!trigger) return;
  const anchor = trigger.getBoundingClientRect();
  const size = popover.getBoundingClientRect();
  const maxLeft = window.innerWidth - size.width - VIEWPORT_MARGIN;
  const left = Math.max(VIEWPORT_MARGIN, Math.min(anchor.left, maxLeft));
  let top = anchor.bottom + ANCHOR_GAP;
  if (top + size.height > window.innerHeight - VIEWPORT_MARGIN) {
    top = Math.max(VIEWPORT_MARGIN, anchor.top - size.height - ANCHOR_GAP);
  }
  popover.style.left = `${left}px`;
  popover.style.top = `${top}px`;
}
