import type { ReactNode } from 'react';

import type { IconProps } from './types';

export function SvgIcon({ className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      {children}
    </svg>
  );
}
