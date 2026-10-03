import { SvgIcon } from '../SvgIcon';
import type { IconProps } from '../types';

export function PlayIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="m8 4 12 8-12 8Z" />
    </SvgIcon>
  );
}
