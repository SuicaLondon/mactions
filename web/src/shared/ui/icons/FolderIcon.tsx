import { SvgIcon } from './SvgIcon';
import type { IconProps } from './types';

export function FolderIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
    </SvgIcon>
  );
}
