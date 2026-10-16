import { type ReactNode, useRef } from 'react';

import { cn } from '../../../lib/cn';
import { useClampedText } from '../hooks/use-clamped-text';
import { MessageDetails } from './MessageDetails';

/**
 * A message line that always reserves two lines, so it never moves the content below. Text that
 * does not fit is clamped, and a Details link beside it opens the full message.
 */
export function ClampedMessage({
  children,
  className,
  textClassName,
  live = false,
}: {
  children: ReactNode;
  /** Classes for the reserved slot, such as its margin. */
  className?: string;
  /** Classes for the text, such as its color. */
  textClassName?: string;
  /** Announces changes politely to screen readers. */
  live?: boolean;
}) {
  const text = useRef<HTMLParagraphElement>(null);
  const clamped = useClampedText(text);
  let ariaLive: 'polite' | undefined;
  if (live) ariaLive = 'polite';
  return (
    <div className={cn('flex min-h-8 items-start gap-2', className)}>
      <p
        ref={text}
        aria-live={ariaLive}
        className={cn('m-0 line-clamp-2 min-w-0 flex-1 text-xs/4', textClassName)}
      >
        {children}
      </p>
      {!!clamped && <MessageDetails message={clamped} />}
    </div>
  );
}
