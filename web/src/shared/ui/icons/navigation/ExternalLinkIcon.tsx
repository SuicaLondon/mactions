import { SvgIcon } from '../SvgIcon';
import type { IconProps } from '../types';

export function ExternalLinkIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M14 4h6v6M20 4 10 14M10 4H4v16h16v-6" />
    </SvgIcon>
  );
}
