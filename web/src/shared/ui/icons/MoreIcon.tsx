import { SvgIcon } from './SvgIcon';
import type { IconProps } from './types';

/** A horizontal ellipsis for menus of further actions. */
export function MoreIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M5 12h.01M12 12h.01M19 12h.01" />
    </SvgIcon>
  );
}
