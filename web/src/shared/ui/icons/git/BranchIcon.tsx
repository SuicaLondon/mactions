import { SvgIcon } from '../SvgIcon';
import type { IconProps } from '../types';

export function BranchIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <circle cx="6" cy="5" r="2" />
      <circle cx="6" cy="19" r="2" />
      <circle cx="18" cy="5" r="2" />
      <path d="M6 7v10M18 7a10 10 0 0 1-10 10H6" />
    </SvgIcon>
  );
}
