import { CheckIcon } from '../../../icons/CheckIcon';
import { LoadingSpinner } from '../../../loading/components/LoadingSpinner';
import { type SelectOption } from '../types';

/** An option in the menu with its detail and selected check, or the chosen value in the field. */
export function SelectOptionLabel({
  option,
  context,
  selected,
  loadingMore,
}: {
  option: SelectOption;
  context: { context: string };
  selected: boolean;
  /** This is the Load more row and the next page is loading. */
  loadingMore: boolean;
}) {
  if (loadingMore) return <LoadingSpinner label="Loading more options…" />;
  if (context.context === 'value') {
    return <span title={option.label}>{option.label}</span>;
  }
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="min-w-0 flex-1">
        <span className="block leading-normal wrap-anywhere">{option.label}</span>
        {!!option.detail && (
          <small className="mt-0.5 block text-xs text-muted">{option.detail}</small>
        )}
      </div>
      {!!selected && <CheckIcon className="size-3.5 shrink-0 text-accent" />}
    </div>
  );
}
