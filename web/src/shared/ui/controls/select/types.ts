import { type ReactNode } from 'react';
import { type Props } from 'react-select';

export interface SelectOption {
  value: string;
  label: string;
  detail?: string;
  muted?: boolean;
}

/** Menu behavior for options that load on demand. */
export interface SelectMenuOptions {
  /** Options are loading; the control shows a spinner and the Load more row waits. */
  loading?: boolean;
  /** Content pinned below the options. */
  footer?: ReactNode;
  onOpen?: () => void;
  onClose?: () => void;
  /** Adds a final option that requests the next page without changing the selection. */
  onLoadMore?: () => void;
  loadMoreLabel?: string;
}

export type ReactSelectProps = Props<SelectOption, false> & { menuFooter?: ReactNode };

/**
 * `field`: borderless inside a labeled toolbar field. `toolbar`: a compact bordered control.
 * `form`: a taller bordered control for dialog forms.
 */
export type SelectVariant = 'field' | 'toolbar' | 'form';
