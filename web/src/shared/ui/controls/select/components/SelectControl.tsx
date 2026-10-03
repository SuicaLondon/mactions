import { type ReactNode, useId, useRef, useState } from 'react';
import ReactSelect from 'react-select';

import { menuPosition } from '../models/menu-position';
import { selectClassNames } from '../models/select-class-names';
import type { SelectOption } from '../types';
import type { DropdownProps } from '../types';
import { DropdownInput } from './DropdownInput';
import { DropdownLoadingMessage } from './DropdownLoadingMessage';
import { DropdownMenu } from './DropdownMenu';
import { DropdownValueContainer } from './DropdownValueContainer';
import { SelectOptionLabel } from './SelectOptionLabel';

export function SelectControl({
  label,
  value,
  options,
  onChange,
  id,
  className = 'filter-choice min-w-27.5',
  compact = true,
  embedded = true,
  searchable = false,
  clearable = false,
  disabled = false,
  loading = false,
  placeholder,
  onOpen,
  onClose,
  footer,
  onLoadMore,
  loadMoreLabel = 'Load more options',
}: {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  id?: string;
  className?: string;
  compact?: boolean;
  embedded?: boolean;
  searchable?: boolean;
  clearable?: boolean;
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
  onOpen?: () => void;
  onClose?: () => void;
  footer?: ReactNode;
  onLoadMore?: () => void;
  loadMoreLabel?: string;
}) {
  const generatedId = useId();
  const anchorRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const moreValue = `${generatedId}-load-more`;
  let items = options;
  if (onLoadMore) items = [...options, { value: moreValue, label: loadMoreLabel }];
  let selected = options.find((option) => option.value === value) ?? null;
  if (selected === null && value) selected = { value, label: value };
  function close() {
    setOpen(false);
    setInput('');
    onClose?.();
  }
  const props: DropdownProps = {
    inputId: id ?? generatedId,
    instanceId: generatedId,
    'aria-label': label,
    options: items,
    value: selected,
    inputValue: input,
    onInputChange: (value) => setInput(value),
    isOptionDisabled: (option) => option.value === moreValue && loading,
    closeMenuOnSelect: false,
    blurInputOnSelect: false,
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
    onMenuOpen: () => {
      setOpen(true);
      onOpen?.();
    },
    onMenuClose: close,
    onKeyDown: (event) => {
      if (open && event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        close();
      }
    },
    tabSelectsValue: false,
    openMenuOnFocus: false,
    menuPosition: 'fixed',
    menuPlacement: 'auto',
    menuShouldScrollIntoView: false,
    maxMenuHeight: 240,
    closeMenuOnScroll: (event) =>
      !(
        event.target instanceof Element &&
        event.target.closest('[role="listbox"], .select-menu-footer')
      ),
    unstyled: true,
    classNames: selectClassNames(compact, embedded),
    styles: {
      menuPortal: (base) => ({
        ...base,
        ...menuPosition(base, anchorRef.current),
        zIndex: 20,
      }),
    },
    components: {
      Menu: DropdownMenu,
      Input: DropdownInput,
      ValueContainer: DropdownValueContainer,
      LoadingMessage: DropdownLoadingMessage,
    },
    menuFooter: footer,
    noOptionsMessage: () => 'No matching options. Try another search.',
    formatOptionLabel: (option, context) => (
      <SelectOptionLabel
        option={option}
        context={context}
        value={value}
        moreValue={moreValue}
        loading={loading}
      />
    ),
  };
  return (
    <div ref={anchorRef} className={className}>
      <ReactSelect<SelectOption> {...props} />
    </div>
  );
}
