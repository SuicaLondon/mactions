import { type ReactNode } from 'react';

import { cn } from '../../../shared/lib/cn';
import { PersonIcon } from '../../../shared/ui/icons/PersonIcon';
import { InlineLoading } from '../../../shared/ui/loading/components/InlineLoading';
import { useConnection } from '../hooks/use-connection';

const controlClassName = cn(
  'inline-flex min-h-7 max-w-60 min-w-0 items-center gap-1.5',
  'rounded-md border-0 bg-transparent px-2 py-1 text-xs text-muted shadow-none',
  'enabled:hover:bg-muted/10 max-md:min-h-10 max-md:max-w-37.5 max-md:pl-0',
  'pointer-coarse:min-h-10',
  // Phones show only the account icon, centred in a 40px square hit area.
  'max-sm:size-10 max-sm:max-w-10 max-sm:justify-center max-sm:p-0',
);

export function GitHubStatus({
  interactive = true,
  onOpen,
}: {
  interactive?: boolean;
  onOpen: () => void;
}) {
  const connection = useConnection();
  const unavailable = connection.isError || connection.data?.state === 'unavailable';
  let label = 'GitHub CLI · Not connected';
  if (connection.isPending) label = 'GitHub CLI · Checking…';
  else if (connection.data?.connected) label = `GitHub CLI · @${connection.data.login}`;
  else if (unavailable) label = 'GitHub CLI · Status unavailable';
  let title = 'Uses GitHub CLI on the Mac running mactions.';
  if (connection.data?.connected) {
    title = `Using @${connection.data.login} from GitHub CLI on this Mac. Open account settings.`;
  } else if (unavailable) {
    title = 'Unable to verify GitHub CLI status. Open settings to check again.';
  }
  let visibleLabel: ReactNode = label;
  if (connection.isPending) {
    visibleLabel = <InlineLoading label="Checking GitHub connection…" className="h-4 w-39" />;
  }
  const content = (
    <>
      {/* Phones hide the label, so an account icon carries the status dot as a badge. */}
      <span className="relative inline-flex shrink-0 items-center" aria-hidden="true">
        <PersonIcon className="hidden size-4 max-sm:block" />
        <span
          className={cn(
            'size-1.75 shrink-0 rounded-full bg-muted',
            'max-sm:absolute max-sm:-right-0.5 max-sm:-bottom-0.5 max-sm:size-2',
            'max-sm:ring-2 max-sm:ring-toolbar',
            { 'bg-activity-success': connection.data?.connected },
          )}
        />
      </span>
      <span className="min-w-0 truncate max-sm:hidden">{visibleLabel}</span>
    </>
  );
  // Settings open only once the connection check finishes.
  if (interactive && !connection.isPending) {
    return (
      <button className={controlClassName} aria-label={label} title={title} onClick={onOpen}>
        {content}
      </button>
    );
  }
  return (
    <span className={controlClassName} title={title}>
      {content}
    </span>
  );
}
