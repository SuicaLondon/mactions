import { CloseIcon } from '../actions/CloseIcon';
import { RefreshIcon } from '../actions/RefreshIcon';
import { CancelIcon } from './CancelIcon';
import { CheckIcon } from './CheckIcon';
import { ClockIcon } from './ClockIcon';
import { MinusIcon } from './MinusIcon';

export const statusIcons = {
  clock: ClockIcon,
  check: CheckIcon,
  close: CloseIcon,
  refresh: RefreshIcon,
  cancel: CancelIcon,
  minus: MinusIcon,
};

export type StatusIconName = keyof typeof statusIcons;
