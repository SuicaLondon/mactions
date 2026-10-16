import { components as defaults, type InputProps } from 'react-select';

import { cn } from '../../../../lib/cn';
import { type SelectOption } from '../types';

/** The search input without its own border, since the field draws one. */
export function SelectInput(props: InputProps<SelectOption, false>) {
  return (
    <defaults.Input
      {...props}
      inputClassName={cn(
        'min-h-0 rounded-none border-0 shadow-none outline-none',
        'focus:shadow-none focus:outline-none',
        props.inputClassName,
      )}
    />
  );
}
