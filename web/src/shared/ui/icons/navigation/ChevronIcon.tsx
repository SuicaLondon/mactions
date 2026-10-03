import { SvgIcon } from '../SvgIcon';
import type { IconProps } from '../types';

export function ChevronIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="m9 5 7 7-7 7" />
    </SvgIcon>
  );
}
