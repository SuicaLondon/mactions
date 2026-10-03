import type { ComponentType } from 'react';

export interface IconProps {
  className?: string;
}

export type IconComponent = ComponentType<IconProps>;
