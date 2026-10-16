import { type ReactNode, useId } from 'react';

import { cn } from '../../../../../../shared/lib/cn';
import { MoreIcon } from '../../../../../../shared/ui/icons/MoreIcon';
import { usePhoneViewport } from '../../../../shared/hooks/use-phone-viewport';

/**
 * The secondary log actions. Wider viewports show them inline: the container becomes
 * `display: contents`, so its children lay out as toolbar items. Phones keep them in a
 * popover that the "More log actions" button opens as a bottom sheet.
 */
export function JobLogActionsMenu({ children }: { children: ReactNode }) {
  const menuId = useId();
  const phone = usePhoneViewport();
  let popover: 'auto' | undefined;
  if (phone) popover = 'auto';
  return (
    <>
      {!!phone && (
        <button
          type="button"
          className={cn(
            'size-10 min-h-10 min-w-10 shrink-0 rounded-md border border-slate-700',
            'bg-slate-800 p-0 text-slate-100 shadow-none md:hidden',
          )}
          popoverTarget={menuId}
          aria-label="More log actions"
          title="More log actions"
        >
          <MoreIcon className="mx-auto size-5 stroke-3" />
        </button>
      )}
      <div
        id={menuId}
        popover={popover}
        className={cn(
          'text-xs text-slate-100 md:contents',
          'max-md:fixed max-md:inset-x-3 max-md:top-auto max-md:bottom-3 max-md:m-0',
          'max-md:w-auto max-md:rounded-md max-md:border max-md:border-slate-700',
          'max-md:bg-slate-900 max-md:p-2 max-md:scheme-dark max-md:shadow-lg',
          'max-md:open:flex max-md:open:flex-col max-md:open:items-stretch',
          'max-md:open:gap-1',
        )}
      >
        {children}
      </div>
    </>
  );
}
