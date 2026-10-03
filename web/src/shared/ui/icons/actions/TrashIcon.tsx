import { SvgIcon } from '../SvgIcon';
import type { IconProps } from '../types';

export function TrashIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7" />
    </SvgIcon>
  );
}
