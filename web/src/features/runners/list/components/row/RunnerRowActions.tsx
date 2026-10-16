import { cn } from '../../../../../shared/lib/cn';
import { IconButton } from '../../../../../shared/ui/controls/buttons/IconButton';
import { ChevronIcon } from '../../../../../shared/ui/icons/ChevronIcon';
import { InfoIcon } from '../../../../../shared/ui/icons/InfoIcon';

interface RunnerRowActionsProps {
  name: string;
  onOpen: () => void;
  onDetails: () => void;
}

/** The chevron opens the runner's runs like the row; the info button opens the inspector. */
export function RunnerRowActions({ name, onOpen, onDetails }: RunnerRowActionsProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-end gap-2 @max-3xl:col-start-4',
        '@max-3xl:col-end-auto @max-3xl:row-start-1 @max-3xl:row-end-3 @max-3xl:gap-1.25',
        '@max-md:col-start-3 @max-md:col-end-auto @max-md:row-start-1',
        '@max-md:row-end-auto',
        'min-w-0',
      )}
      role="gridcell"
    >
      <IconButton
        // Phones tap the whole row, so the chevron is hidden there; elsewhere its title explains it.
        className="max-md:hidden"
        icon={ChevronIcon}
        iconClassName="size-3.25"
        label={`Open runs for ${name}`}
        // The focusable row already opens runs with Enter, so this avoids a second tab stop.
        tabIndex={-1}
        onClick={(event) => {
          event.stopPropagation();
          onOpen();
        }}
      />
      <IconButton
        icon={InfoIcon}
        label={`Details for ${name}`}
        onClick={(event) => {
          event.stopPropagation();
          onDetails();
        }}
      />
    </div>
  );
}
