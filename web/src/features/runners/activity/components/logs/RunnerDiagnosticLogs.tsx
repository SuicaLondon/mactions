import { type ReactNode } from 'react';

import type { LogSnapshot } from '../../../../../shared/api/types';
import { cn } from '../../../../../shared/lib/cn';
import { ErrorState } from '../../../../../shared/ui/feedback/components/ErrorState';
import { LogLinesSkeleton } from '../../../../../shared/ui/loading/components/LogLinesSkeleton';
import { Skeleton } from '../../../../../shared/ui/loading/components/Skeleton';
import { useFollowedLogOutput } from '../../hooks/use-followed-log-output';
import type { RunnerActivityLayout } from '../../models/runner-activity';
import type { RunnerLogView } from '../../models/runner-log-view';
import { RunnerLogControls } from './RunnerLogControls';

// The page joins the output to the toolbar above it and lets it fill the remaining height.
const outputClasses: Record<RunnerActivityLayout, string> = {
  panel: 'min-h-30 px-4 py-3.5',
  page: 'min-h-0 w-full scrollbar-gutter-stable rounded-b-md p-3',
};

const noteClasses: Record<RunnerActivityLayout, string> = {
  panel: '',
  page: 'shrink-0',
};

interface RunnerDiagnosticLogsProps {
  layout: RunnerActivityLayout;
  /** The latest log read; undefined until one succeeds. */
  snapshot: LogSnapshot | undefined;
  error: Error | null;
  retrying: boolean;
  onRetry: () => void;
  view: RunnerLogView;
  onViewChange: (change: Partial<RunnerLogView>) => void;
}

export function RunnerDiagnosticLogs({
  layout,
  snapshot,
  error,
  retrying,
  onRetry,
  view,
  onViewChange,
}: RunnerDiagnosticLogsProps) {
  const output = useFollowedLogOutput(snapshot, view.follow, view.wrap);
  // Without any output to keep, the failure takes the output's place; later poll failures show in
  // the controls row so the log never moves or flickers.
  let loadError: Error | null = null;
  let refreshError: Error | null = null;
  if (snapshot) refreshError = error;
  else loadError = error;
  let logText: ReactNode = (
    <Skeleton label="Loading runner logs…">
      <LogLinesSkeleton />
    </Skeleton>
  );
  if (snapshot) logText = snapshot.content || 'No log output yet.';
  let logOutput = (
    <pre
      ref={output}
      data-wrapped={view.wrap || undefined}
      className={cn(
        'm-0 h-auto flex-1 overflow-auto rounded-lg border border-line bg-canvas',
        'font-mono text-xs/relaxed whitespace-pre select-text',
        outputClasses[layout],
        { 'break-normal wrap-anywhere whitespace-pre-wrap': view.wrap },
      )}
      tabIndex={0}
      aria-label="Runner log output"
    >
      {logText}
    </pre>
  );
  if (loadError) {
    logOutput = (
      <ErrorState
        title="Couldn't load runner logs"
        error={loadError}
        retrying={retrying}
        onRetry={onRetry}
        className="min-h-30 rounded-lg border border-line bg-canvas"
      />
    );
  }
  return (
    <>
      <RunnerLogControls
        layout={layout}
        files={snapshot?.files}
        refreshError={refreshError}
        retrying={retrying}
        onRetry={onRetry}
        view={view}
        onViewChange={onViewChange}
      />
      {logOutput}
      <p className={cn('mx-0 mt-2 mb-0 text-xs/normal text-muted', noteClasses[layout])}>
        {snapshot?.selected || 'Existing diagnostic and service logs'}
        {snapshot?.truncated && ' · Showing the last 64 KiB'}
      </p>
    </>
  );
}
