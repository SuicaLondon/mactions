import type { StatusIconName } from './status-icons';
import { statusIcons } from './status-icons';
import type { IconProps } from './types';

export function StatusIcon({ name, ...props }: IconProps & { name: StatusIconName }) {
  const Icon = statusIcons[name];
  return <Icon {...props} />;
}
