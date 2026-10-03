import { SvgIcon } from '../SvgIcon';
import type { IconProps } from '../types';

export function StopIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <rect x="5" y="5" width="14" height="14" rx="2" />
    </SvgIcon>
  );
}
