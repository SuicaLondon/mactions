import { components as defaults, type MenuProps } from 'react-select';

import { type ReactSelectProps, type SelectOption } from '../types';

/** The menu, with the caller's footer below the options. */
export function SelectMenu(props: MenuProps<SelectOption, false>) {
  const footer = (props.selectProps as ReactSelectProps).menuFooter;
  return (
    <defaults.Menu {...props}>
      {props.children}
      {!!footer && (
        <div
          data-select-menu-footer
          className="border-t border-line px-2.5 py-1.75 text-xs"
          onMouseDown={(event) => event.preventDefault()}
        >
          {footer}
        </div>
      )}
    </defaults.Menu>
  );
}
