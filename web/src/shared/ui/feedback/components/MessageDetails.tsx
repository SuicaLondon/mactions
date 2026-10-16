import { type ToggleEvent, useId, useRef } from 'react';

import { cn } from '../../../lib/cn';
import { compactTouchHitAreaClassName } from '../../controls/buttons/link-button-class';
import { placeNear } from '../models/place-popover';

/** A Details link that opens the full text of a clamped message, for touch and keyboard users. */
export function MessageDetails({ message }: { message: string }) {
  const popoverId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button
        ref={trigger}
        type="button"
        popoverTarget={popoverId}
        className={cn(
          'min-h-0 shrink-0 border-0 bg-transparent p-0 text-xs/4 text-accent',
          'shadow-none',
          compactTouchHitAreaClassName,
        )}
      >
        Details
      </button>
      <span
        id={popoverId}
        popover="auto"
        onToggle={(event: ToggleEvent<HTMLSpanElement>) => {
          if (event.newState === 'open') placeNear(trigger.current, event.currentTarget);
        }}
        className={cn(
          'fixed inset-auto m-0 max-w-72 rounded-md border border-line bg-surface p-3',
          'text-xs/normal wrap-anywhere whitespace-pre-wrap text-foreground',
          'shadow-lg',
        )}
      >
        {message}
      </span>
    </>
  );
}
