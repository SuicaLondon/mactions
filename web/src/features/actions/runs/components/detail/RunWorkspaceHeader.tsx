import { useId, useState } from 'react';

import { cn } from '../../../../../shared/lib/cn';
import type { WorkflowRun } from '../../../data/types/activity-types';
import type { RefreshState } from '../../../shared/types/refresh-state';
import type { RunProgress } from '../../models/run-progress';
import { RunWorkspaceActions } from './RunWorkspaceActions';
import { RunWorkspaceIdentity } from './RunWorkspaceIdentity';
import { RunWorkspaceSummary } from './RunWorkspaceSummary';

export function RunWorkspaceHeader({
  run,
  progress,
  refresh,
}: {
  run: WorkflowRun;
  /** Job progress once the run's jobs have loaded. */
  progress: RunProgress | null;
  refresh: RefreshState;
}) {
  const detailsId = useId();
  const [expanded, setExpanded] = useState(false);
  return (
    <header
      className={cn(
        'flex shrink-0 items-center justify-between gap-4 border-b',
        'border-b-line px-4.5 py-2.5 max-md:px-3 max-sm:flex-col max-sm:items-stretch',
        'max-sm:gap-2',
        { 'max-md:py-1': !expanded },
      )}
    >
      {/* Phones collapse the header to one line with a details disclosure. */}
      <RunWorkspaceSummary
        run={run}
        refresh={refresh}
        expanded={expanded}
        detailsId={detailsId}
        onToggle={() => setExpanded(!expanded)}
      />
      {/* `contents` keeps the identity and actions as header items on wider viewports. */}
      <div id={detailsId} className={cn('contents', { 'max-md:hidden': !expanded })}>
        <RunWorkspaceIdentity run={run} refresh={refresh} />
        <RunWorkspaceActions run={run} progress={progress} refresh={refresh} />
      </div>
    </header>
  );
}
