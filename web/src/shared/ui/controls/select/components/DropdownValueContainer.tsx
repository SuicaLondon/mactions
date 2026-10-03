import { Children, cloneElement, isValidElement } from 'react';
import { components, type ValueContainerProps } from 'react-select';

import { cn } from '../../../../lib/cn';
import type { SelectOption } from '../types';

export function DropdownValueContainer(props: ValueContainerProps<SelectOption, false>) {
  return (
    <components.ValueContainer {...props}>
      {/* React Select's non-searchable input is only exposed through this container. */}
      {/* eslint-disable-next-line react-x/no-children-map */}
      {Children.map(props.children, (child) => {
        if (
          !isValidElement<{ 'aria-readonly'?: boolean; className?: string }>(child) ||
          !child.props['aria-readonly']
        ) {
          return child;
        }
        // eslint-disable-next-line react-x/no-clone-element -- Preserve React Select's focus handlers while styling its non-searchable input directly.
        return cloneElement(child, {
          className: cn(
            'left-0! min-h-0 transform-none! rounded-none border-0 shadow-none outline-none',
            'focus:shadow-none focus:outline-none',
            child.props.className,
          ),
        });
      })}
    </components.ValueContainer>
  );
}
