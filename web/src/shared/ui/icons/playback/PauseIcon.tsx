import { SvgIcon } from '../SvgIcon';
import type { IconProps } from '../types';

export function PauseIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M9 5v14M15 5v14" />
    </SvgIcon>
  );
}
