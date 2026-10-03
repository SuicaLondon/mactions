import { SvgIcon } from '../SvgIcon';
import type { IconProps } from '../types';

export function LockIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <rect x="5" y="10" width="14" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </SvgIcon>
  );
}
