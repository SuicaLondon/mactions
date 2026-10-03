import { SvgIcon } from '../SvgIcon';
import type { IconProps } from '../types';

export function ServerIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <rect x="4" y="3" width="16" height="7" rx="2" />
      <rect x="4" y="14" width="16" height="7" rx="2" />
      <path d="M8 6.5h.01M8 17.5h.01M12 6.5h4M12 17.5h4" />
    </SvgIcon>
  );
}
