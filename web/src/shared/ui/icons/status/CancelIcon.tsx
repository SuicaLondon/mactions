import { SvgIcon } from '../SvgIcon';
import type { IconProps } from '../types';

export function CancelIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m6 18 12-12" />
    </SvgIcon>
  );
}
