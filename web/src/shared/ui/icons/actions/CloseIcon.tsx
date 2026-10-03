import { SvgIcon } from '../SvgIcon';
import type { IconProps } from '../types';

export function CloseIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="m6 6 12 12M6 18 18 6" />
    </SvgIcon>
  );
}
