import { SvgIcon } from '../SvgIcon';
import type { IconProps } from '../types';

export function FilterIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M4 6h16M7 12h10M10 18h4" />
    </SvgIcon>
  );
}
