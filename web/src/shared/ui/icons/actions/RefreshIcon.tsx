import { SvgIcon } from '../SvgIcon';
import type { IconProps } from '../types';

export function RefreshIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M20 10a8 8 0 1 0-2 8M20 4v6h-6" />
    </SvgIcon>
  );
}
