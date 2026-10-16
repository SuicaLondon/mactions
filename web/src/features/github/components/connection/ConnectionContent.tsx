import type { ReactNode } from 'react';

import { cn } from '../../../../shared/lib/cn';
import { useConnection } from '../../hooks/use-connection';
import type { ConnectionPanelVariant } from '../../models/connection-panel';

const contentClasses: Record<ConnectionPanelVariant, string> = {
  banner: 'pt-2',
  card: 'flex flex-col items-start gap-3 pt-4',
};

const headingClasses: Record<ConnectionPanelVariant, string> = {
  banner: 'mt-1',
  card: 'm-0',
};

export function ConnectionContent({
  variant,
  showHeading,
  children,
}: {
  variant: ConnectionPanelVariant;
  /** Shows the first-run heading above the description. */
  showHeading: boolean;
  children: ReactNode;
}) {
  const connected = useConnection().data?.connected;
  let description =
    'mactions uses GitHub CLI (gh) on this Mac. Connect GitHub to choose repositories, register runners, and view jobs.';
  if (connected)
    description =
      'Uses the GitHub CLI account on this Mac. GitHub permissions are checked separately for each target.';
  return (
    <div className={cn('mx-0 mb-2 max-w-180 px-0 pb-0', contentClasses[variant])}>
      {showHeading && (
        <h2 className={cn('text-base', headingClasses[variant])}>Connect GitHub to get started</h2>
      )}
      <p className="leading-relaxed">{description}</p>
      {children}
    </div>
  );
}
