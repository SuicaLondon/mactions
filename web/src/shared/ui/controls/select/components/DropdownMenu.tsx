import { components, type MenuProps } from 'react-select';

import type { SelectOption } from '../types';
import type { DropdownProps } from '../types';

export function DropdownMenu(props: MenuProps<SelectOption, false>) {
  const footer = (props.selectProps as DropdownProps).menuFooter;
  return (
    <components.Menu {...props}>
      {props.children}
      {!!footer && (
        <div
          className="select-menu-footer border-t border-line px-2.5 py-1.75 text-xs"
          onMouseDown={(event) => event.preventDefault()}
        >
          {footer}
        </div>
      )}
    </components.Menu>
  );
}
