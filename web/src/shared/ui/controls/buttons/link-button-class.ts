import { cn } from '../../../lib/cn';

/**
 * A text-only button styled as a link. Below md and on touch screens an invisible pseudo-element
 * extends its hit area to at least 40px tall without changing layout or text size.
 */
export const linkButtonClassName = cn(
  'min-h-5.5 border-0 bg-transparent p-0 text-xs text-accent shadow-none',
  'max-md:relative max-md:after:absolute max-md:after:-inset-x-1',
  'max-md:after:-inset-y-2.5',
  'pointer-coarse:relative pointer-coarse:after:absolute',
  'pointer-coarse:after:-inset-x-1',
  'pointer-coarse:after:-inset-y-2.5',
);

/** The same invisible 40px touch hit area for compact 16px text buttons. */
export const compactTouchHitAreaClassName = cn(
  'max-md:relative max-md:after:absolute max-md:after:-inset-x-1',
  'max-md:after:-inset-y-3',
  'pointer-coarse:relative pointer-coarse:after:absolute',
  'pointer-coarse:after:-inset-x-1 pointer-coarse:after:-inset-y-3',
);
