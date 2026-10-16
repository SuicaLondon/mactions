import { type ToggleEvent, useId, useRef } from 'react';

import { cn } from '../../../lib/cn';
import { compactTouchHitAreaClassName } from '../../controls/buttons/link-button-class';
import { placeNear } from '../models/place-popover';

const toneClasses = {
  default: { text: 'text-danger', retry: 'text-accent' },
  dark: { text: 'text-red-300', retry: 'text-sky-300' },
};

/**
 * Reports a failed background refresh while older data stays on screen. It always holds its space
 * in the header row (invisible without an error), so a failed poll never moves nearby controls.
 * Retry stays inline; the label opens a popover with the full message.
 */
export function UpdateFailedIndicator({
  error,
  onRetry,
  retrying = false,
  label = 'Update failed',
  tone = 'default',
  className,
}: {
  error: Error | null;
  onRetry: () => void;
  retrying?: boolean;
  label?: string;
  tone?: keyof typeof toneClasses;
  className?: string;
}) {
  const popoverId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const hidden = !error;
  let tabIndex: number | undefined;
  if (hidden) tabIndex = -1;
  return (
    <span
      role="status"
      title={error?.message}
      aria-hidden={hidden || undefined}
      className={cn(
        'inline-flex shrink-0 items-center gap-1 text-xs whitespace-nowrap',
        toneClasses[tone].text,
        { invisible: hidden },
        className,
      )}
    >
      <button
        ref={trigger}
        type="button"
        popoverTarget={popoverId}
        className={cn(
          'min-h-0 border-0 bg-transparent p-0 text-xs/4 underline',
          'decoration-dotted underline-offset-2 shadow-none',
          toneClasses[tone].text,
          compactTouchHitAreaClassName,
        )}
        disabled={hidden}
        tabIndex={tabIndex}
      >
        {label}
      </button>
      {!!error && <span className="sr-only">: {error.message}</span>}
      {!!error && (
        <span
          id={popoverId}
          popover="auto"
          onToggle={(event: ToggleEvent<HTMLSpanElement>) => {
            if (event.newState === 'open') placeNear(trigger.current, event.currentTarget);
          }}
          className={cn(
            'fixed inset-auto m-0 max-w-72 flex-col items-start gap-2 rounded-md border',
            'border-line bg-surface p-3 text-xs/normal whitespace-normal',
            'text-foreground shadow-lg open:flex',
          )}
        >
          <span className="wrap-anywhere whitespace-pre-wrap">{error.message}</span>
        </span>
      )}
      <span aria-hidden="true">·</span>
      <button
        type="button"
        className={cn(
          'min-h-0 border-0 bg-transparent p-0 text-xs/4 shadow-none',
          toneClasses[tone].retry,
          compactTouchHitAreaClassName,
        )}
        disabled={retrying || hidden}
        tabIndex={tabIndex}
        onClick={onRetry}
      >
        Retry
      </button>
    </span>
  );
}
