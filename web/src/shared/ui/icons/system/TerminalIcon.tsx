import { SvgIcon } from '../SvgIcon';
import type { IconProps } from '../types';

export function TerminalIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <path d="m7 9 3 3-3 3M13 15h4" />
    </SvgIcon>
  );
}
