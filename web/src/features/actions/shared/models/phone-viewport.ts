/** Matches Tailwind's `max-md` variant: viewports narrower than 48rem. */
export const phoneViewportQuery = '(width < 48rem)';

/** Whether the window is phone-sized, for one-time defaults that CSS cannot set. */
export function isPhoneViewport(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(phoneViewportQuery).matches;
}
