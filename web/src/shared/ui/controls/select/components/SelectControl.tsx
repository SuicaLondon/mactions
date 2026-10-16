import { useId, useRef } from 'react';
import ReactSelect from 'react-select';

import { useSelectMenu } from '../hooks/use-select-menu';
import { menuPosition } from '../models/menu-position';
import { selectBehavior } from '../models/select-behavior';
import { selectClassNames } from '../models/select-class-names';
import { selectedOption, selectItems } from '../models/select-options';
import {
  type ReactSelectProps,
  type SelectMenuOptions,
  type SelectOption,
  type SelectVariant,
} from '../types';
import { SelectInput } from './SelectInput';
import { SelectLoadingMessage } from './SelectLoadingMessage';
import { SelectMenu } from './SelectMenu';
import { SelectNoOptionsMessage } from './SelectNoOptionsMessage';
import { SelectOptionLabel } from './SelectOptionLabel';
import { SelectValueContainer } from './SelectValueContainer';

// React Select part overrides, shared by every select.
const components = {
  Menu: SelectMenu,
  Input: SelectInput,
  ValueContainer: SelectValueContainer,
  LoadingMessage: SelectLoadingMessage,
  NoOptionsMessage: SelectNoOptionsMessage,
};

export interface SelectControlProps {
  /** The accessible name of the combobox. */
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  variant: SelectVariant;
  id?: string;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean;
  /** Allows choosing no value, reported as an empty string. */
  clearable?: boolean;
  menu?: SelectMenuOptions;
}

export function SelectControl({
  label,
  value,
  options,
  onChange,
  variant,
  id,
  className,
  placeholder,
  disabled = false,
  searchable = false,
  clearable = false,
  menu: { loading = false, footer, onOpen, onClose, onLoadMore, loadMoreLabel } = {},
}: SelectControlProps) {
  const generatedId = useId();
  const anchorRef = useRef<HTMLDivElement>(null);
  const { open, input, setInput, close, openMenu, onKeyDown } = useSelectMenu({ onOpen, onClose });
  const moreValue = `${generatedId}-load-more`;
  let loadMore: SelectOption | undefined;
  if (onLoadMore) loadMore = { value: moreValue, label: loadMoreLabel ?? 'Load more options' };
  const props: ReactSelectProps = {
    ...selectBehavior,
    inputId: id ?? generatedId,
    instanceId: generatedId,
    'aria-label': label,
    options: selectItems(options, loadMore),
    value: selectedOption(options, value),
    inputValue: input,
    onInputChange: (value) => setInput(value),
    isOptionDisabled: (option) => option.value === moreValue && loading,
    onChange: (option) => {
      if (option?.value === moreValue) {
        onLoadMore?.();
        return;
      }
      if (option || clearable) onChange(option?.value ?? '');
      close();
    },
    isSearchable: searchable,
    isClearable: clearable,
    isDisabled: disabled,
    isLoading: loading,
    placeholder,
    menuIsOpen: open,
    onMenuOpen: openMenu,
    onMenuClose: close,
    onKeyDown,
    classNames: selectClassNames(variant),
    styles: {
      menuPortal: (base) => ({
        ...base,
        ...menuPosition(base, anchorRef.current),
        zIndex: 20,
      }),
    },
    components,
    menuFooter: footer,
    formatOptionLabel: (option, context) => (
      <SelectOptionLabel
        option={option}
        context={context}
        selected={option.value === value}
        loadingMore={option.value === moreValue && loading}
      />
    ),
  };
  return (
    <div ref={anchorRef} className={className}>
      <ReactSelect<SelectOption> {...props} />
    </div>
  );
}
