import type { ClassNamesConfig } from 'react-select';

import { cn } from '../../../../lib/cn';
import type { SelectOption } from '../types';

export function selectClassNames(
  compact: boolean,
  embedded: boolean,
): ClassNamesConfig<SelectOption, false> {
  return {
    control: (state) =>
      cn('rounded-md text-xs', {
        'min-h-7.5!': compact,
        'min-h-9!': !compact,
        'cursor-default! opacity-50': state.isDisabled,
        'cursor-pointer!': !state.isDisabled,
        'border-0! bg-transparent shadow-none': embedded,
        'border! bg-control hover:border-accent': !embedded,
        'border-accent! ring-2 ring-focus': !embedded && state.isFocused,
        'border-control-border!': !embedded && !state.isFocused,
      }),
    valueContainer: () =>
      cn({
        'px-1.75 py-0': compact,
        'px-2 py-0.5': !compact,
      }),
    input: () => cn('m-0! p-0! text-foreground!'),
    singleValue: (state) =>
      cn(
        {
          'text-muted': state.data.muted,
          'text-foreground': !state.data.muted,
        },
        'mx-0.5',
      ),
    placeholder: () => cn('mx-0.5 truncate text-muted'),
    menu: () =>
      cn(
        'z-20! my-1.25! rounded-md border border-line bg-surface text-foreground',
        'overflow-hidden shadow-lg',
      ),
    menuList: () => cn('scrollbar-thin overscroll-contain p-1!'),
    option: (state) =>
      cn(
        'min-h-8 cursor-pointer rounded-sm px-2.5 py-1.75 text-xs text-foreground',
        'active:bg-accent/20',
        {
          'bg-accent/15': state.isFocused,
          'bg-accent/10': !state.isFocused && state.isSelected,
          'bg-transparent': !state.isFocused && !state.isSelected,
        },
        {
          'cursor-default opacity-50': state.isDisabled,
        },
      ),
    dropdownIndicator: () =>
      cn('text-muted hover:text-foreground', {
        'px-2 py-1': compact,
        'px-2.25 py-1.5': !compact,
      }),
    clearIndicator: () => cn('p-1.25 text-muted hover:text-foreground'),
    loadingIndicator: () => cn('p-1.25 text-muted'),
    noOptionsMessage: () => cn('px-3 py-2 text-xs leading-normal text-muted'),
    loadingMessage: () => cn('px-3 py-2 text-xs text-muted'),
    indicatorSeparator: () => cn('hidden'),
  };
}
