import { type ReactNode } from 'react';

import { cn } from '../../../../shared/lib/cn';
import { InlineLoading } from '../../../../shared/ui/loading/components/InlineLoading';
import { useConnection } from '../../hooks/use-connection';
import type { ConnectionPanelVariant } from '../../models/connection-panel';
import { ConnectionRecheckButton } from './ConnectionRecheckButton';

const summaryClasses: Record<ConnectionPanelVariant, string> = {
  banner: 'gap-3',
  card: 'gap-x-3 gap-y-2',
};

export function ConnectionSummary({
  variant,
  open,
  onToggle,
}: {
  variant: ConnectionPanelVariant;
  /** The connection details below the summary are visible. */
  open: boolean;
  onToggle: () => void;
}) {
  const connection = useConnection();
  let summary: ReactNode = 'GitHub connection needs attention';
  if (connection.isPending) summary = <InlineLoading label="Checking GitHub connection…" />;
  else if (connection.data?.connected) summary = `Connected as @${connection.data.login}`;
  else if (connection.isError) summary = 'Unable to check GitHub connection';
  let toggleLabel = 'Connect GitHub';
  if (open) toggleLabel = 'Hide';
  else if (connection.data?.connected) toggleLabel = 'Connection settings';
  return (
    <div className={cn('flex flex-wrap items-center', summaryClasses[variant])}>
      <span
        className={cn('size-1.75 shrink-0 rounded-full bg-muted', {
          'bg-activity-success': connection.data?.connected,
        })}
      />
      <span>{summary}</span>
      <button
        type="button"
        className="min-h-5.5 border-0 bg-transparent p-0 text-xs text-accent shadow-none"
        onClick={onToggle}
        aria-expanded={open}
      >
        {toggleLabel}
      </button>
      <ConnectionRecheckButton />
    </div>
  );
}
