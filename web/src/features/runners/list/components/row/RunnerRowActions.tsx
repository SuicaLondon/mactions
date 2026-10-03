import { cn } from '../../../../../shared/lib/cn';
import { IconButton } from '../../../../../shared/ui/controls/buttons/IconButton';
import { ChevronIcon } from '../../../../../shared/ui/icons/navigation/ChevronIcon';
import { InfoIcon } from '../../../../../shared/ui/icons/status/InfoIcon';
import type { RunnerSelection } from '../../models/runner-list';
interface RunnerRowActionsProps {
  row: RunnerSelection;
  onDetails: (runner: RunnerSelection) => void;
}
export function RunnerRowActions({ row, onDetails }: RunnerRowActionsProps) {
  return (
    <div
      className={cn(
        cn(
          'runner-grid-actions flex items-center justify-end gap-2 @max-3xl:col-start-4',
          '@max-3xl:col-end-auto @max-3xl:row-start-1 @max-3xl:row-end-3 @max-3xl:gap-1.25',
          '@max-md:col-start-3 @max-md:col-end-auto @max-md:row-start-1',
          '@max-md:row-end-auto',
        ),
        'min-w-0',
      )}
      role="gridcell"
    >
      <span className="runner-open-indicator inline-flex text-muted" aria-hidden="true">
        <ChevronIcon className="size-3.25" />
      </span>
      <IconButton
        className="runner-details-button"
        icon={InfoIcon}
        label={`Details for ${row.name}`}
        onClick={(event) => {
          event.stopPropagation();
          onDetails(row);
        }}
      />
    </div>
  );
}
