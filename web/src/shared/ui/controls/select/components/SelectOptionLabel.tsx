import { CheckIcon } from '../../../icons/status/CheckIcon';
import { LoadingSpinner } from '../../../loading/components/LoadingSpinner';
import type { SelectOption } from '../types';

export function SelectOptionLabel({
  option,
  context,
  value,
  moreValue,
  loading,
}: {
  option: SelectOption;
  context: { context: string };
  value: string;
  moreValue: string;
  loading: boolean;
}) {
  if (option.value === moreValue && loading) {
    return <LoadingSpinner label="Loading more options…" />;
  }
  if (context.context === 'value') {
    return <span title={option.label}>{option.label}</span>;
  }
  return (
    <div className="select-option-content flex min-w-0 items-center gap-3">
      <div className="min-w-0 flex-1">
        <span className="block leading-normal wrap-anywhere">{option.label}</span>
        {!!option.detail && (
          <small className="mt-0.5 block text-xs text-muted">{option.detail}</small>
        )}
      </div>
      {!!(option.value === value) && <CheckIcon className="size-3.5 shrink-0 text-accent" />}
    </div>
  );
}
