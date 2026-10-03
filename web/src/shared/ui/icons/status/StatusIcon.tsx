import type { IconProps } from '../types';
import type { StatusIconName } from './status-icons';
import { statusIcons } from './status-icons';

export function StatusIcon({ name, ...props }: IconProps & { name: StatusIconName }) {
  const Icon = statusIcons[name];
  return <Icon {...props} />;
}
