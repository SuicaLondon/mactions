import { components, type InputProps } from 'react-select';

import { cn } from '../../../../lib/cn';
import type { SelectOption } from '../types';

export function DropdownInput(props: InputProps<SelectOption, false>) {
  return (
    <components.Input
      {...props}
      inputClassName={cn(
        'min-h-0 rounded-none border-0 shadow-none outline-none',
        'focus:shadow-none focus:outline-none',
        props.inputClassName,
      )}
    />
  );
}
