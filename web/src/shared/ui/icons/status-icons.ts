import { CancelIcon } from './CancelIcon';
import { CheckIcon } from './CheckIcon';
import { ClockIcon } from './ClockIcon';
import { CloseIcon } from './CloseIcon';
import { MinusIcon } from './MinusIcon';
import { RefreshIcon } from './RefreshIcon';

export const statusIcons = {
  clock: ClockIcon,
  check: CheckIcon,
  close: CloseIcon,
  refresh: RefreshIcon,
  cancel: CancelIcon,
  minus: MinusIcon,
};

export type StatusIconName = keyof typeof statusIcons;
