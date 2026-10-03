import { SvgIcon } from '../SvgIcon';
import type { IconProps } from '../types';

export function PlusIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M12 5v14M5 12h14" />
    </SvgIcon>
  );
}
