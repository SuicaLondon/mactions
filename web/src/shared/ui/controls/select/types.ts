import { type ReactNode } from 'react';
import { type Props } from 'react-select';

export interface SelectOption {
  value: string;
  label: string;
  detail?: string;
  muted?: boolean;
}

export type DropdownProps = Props<SelectOption, false> & { menuFooter?: ReactNode };
