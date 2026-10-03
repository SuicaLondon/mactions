import { SvgIcon } from '../SvgIcon';
import type { IconProps } from '../types';

export function WorkflowIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <rect x="3" y="3" width="6" height="6" rx="1.5" />
      <rect x="15" y="3" width="6" height="6" rx="1.5" />
      <rect x="15" y="15" width="6" height="6" rx="1.5" />
      <path d="M9 6h6M6 9v7a2 2 0 0 0 2 2h7" />
    </SvgIcon>
  );
}
