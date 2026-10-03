import { SvgIcon } from '../SvgIcon';
import type { IconProps } from '../types';

export function CommitIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M3 12h5M16 12h5" />
    </SvgIcon>
  );
}
