import { SvgIcon } from '../SvgIcon';
import type { IconProps } from '../types';

export function SearchIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 5 5" />
    </SvgIcon>
  );
}
