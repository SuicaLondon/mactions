import { isPhoneViewport } from '../../shared/models/phone-viewport';

/**
 * Phones wrap log lines by default so long error text stays readable without
 * horizontal scrolling. Wider viewports keep lines unwrapped. The viewer's
 * toggle takes over after this initial value.
 */
export function defaultWrapLines(): boolean {
  return isPhoneViewport();
}
