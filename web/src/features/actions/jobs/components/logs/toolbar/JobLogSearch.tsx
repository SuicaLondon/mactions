import { type KeyboardEvent, useId } from 'react';

import { cn } from '../../../../../../shared/lib/cn';
import { IconButton } from '../../../../../../shared/ui/controls/buttons/IconButton';
import { ChevronIcon } from '../../../../../../shared/ui/icons/ChevronIcon';

const searchKeys = 'Enter next · Shift+Enter previous · Esc clear';

const navigationClassName = cn(
  'size-6 min-h-6 min-w-6 text-slate-300',
  'max-md:size-10 max-md:min-h-10 max-md:min-w-10',
  'pointer-coarse:size-10 pointer-coarse:min-h-10 pointer-coarse:min-w-10',
  'enabled:hover:bg-slate-800 enabled:hover:text-slate-100',
);

/**
 * The log search field. Every control stays mounted with a fixed width so the
 * toolbar never moves while typing or when a log has no matches.
 */
export function JobLogSearch({
  value,
  counter,
  navigable,
  disabled,
  onChange,
  onNext,
  onPrevious,
  onClear,
}: {
  value: string;
  /** Match position text, such as "2 of 5"; empty without a query. */
  counter: string;
  navigable: boolean;
  disabled: boolean;
  onChange: (value: string) => void;
  onNext: () => void;
  onPrevious: () => void;
  onClear: () => void;
}) {
  const hintId = useId();

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (event.shiftKey) {
        onPrevious();
        return;
      }
      onNext();
      return;
    }
    if (event.key !== 'Escape' || !value) return;
    event.preventDefault();
    event.stopPropagation();
    onClear();
  }

  return (
    <div className="flex min-w-0 items-center gap-1 max-md:flex-1">
      <input
        className={cn(
          'min-h-6 w-40 rounded-md border-slate-700 bg-slate-800 px-2 py-0.5',
          'text-xs text-slate-100 placeholder:text-slate-400',
          'max-md:min-h-10 max-md:w-auto max-md:min-w-0 max-md:flex-1',
          'pointer-coarse:min-h-10',
        )}
        type="text"
        aria-label="Search log"
        aria-describedby={hintId}
        title={searchKeys}
        placeholder="Search log"
        spellCheck={false}
        autoComplete="off"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
      />
      <span id={hintId} className="sr-only">
        {searchKeys}
      </span>
      <span
        className={cn(
          'w-20 shrink-0 text-right whitespace-nowrap text-slate-400 tabular-nums',
          'max-md:w-16',
        )}
        aria-live="polite"
        data-testid="job-log-search-counter"
      >
        {counter}
      </span>
      <IconButton
        icon={ChevronIcon}
        label="Previous match"
        className={navigationClassName}
        iconClassName="size-3.5 -rotate-90"
        disabled={!navigable}
        onClick={onPrevious}
      />
      <IconButton
        icon={ChevronIcon}
        label="Next match"
        className={navigationClassName}
        iconClassName="size-3.5 rotate-90"
        disabled={!navigable}
        onClick={onNext}
      />
    </div>
  );
}
