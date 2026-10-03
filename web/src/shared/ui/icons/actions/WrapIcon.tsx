import { SvgIcon } from '../SvgIcon';
import type { IconProps } from '../types';

export function WrapIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M4 6h16M4 11h12a4 4 0 0 1 0 8h-4m3-3-3 3 3 3M4 16h3" />
    </SvgIcon>
  );
}
