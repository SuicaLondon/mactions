import { SvgIcon } from '../SvgIcon';
import type { IconProps } from '../types';

export function MinusIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M5 12h14" />
    </SvgIcon>
  );
}
