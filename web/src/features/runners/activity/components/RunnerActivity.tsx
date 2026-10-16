import { useState } from 'react';

import type { Runner } from '../../../../shared/api/types';
import { cn } from '../../../../shared/lib/cn';
import { RefreshButton } from '../../../../shared/ui/controls/buttons/RefreshButton';
import { useRunnerJobRepository } from '../hooks/use-runner-job-repository';
import { useRunnerJobs } from '../hooks/use-runner-jobs';
import { useRunnerLogView } from '../hooks/use-runner-log-view';
import { useRunnerLogs } from '../hooks/use-runner-logs';
import {
  initialRunnerActivityTab,
  type RunnerActivityLayout,
  runnerActivityTitle,
} from '../models/runner-activity';
import { toggleSelectedJob } from '../models/runner-jobs';
import { RunnerJobRepositoryForm } from './jobs/RunnerJobRepositoryForm';
import { RunnerJobsResults } from './jobs/RunnerJobsResults';
import { RunnerDiagnosticLogs } from './logs/RunnerDiagnosticLogs';
import { RunnerActivityIdentity } from './RunnerActivityIdentity';
import { RunnerActivityTabs } from './RunnerActivityTabs';

const sectionClasses: Record<RunnerActivityLayout, string> = {
  panel: cn(
    'max-h-1/2 min-h-55 shrink-0 overflow-y-auto border-t border-t-line px-5 py-3',
    'max-md:max-h-none',
  ),
  page: 'flex min-h-0 flex-1 flex-col overflow-hidden',
};

const headerClasses: Record<RunnerActivityLayout, string> = {
  panel: 'border-b border-b-line pb-3',
  page: '',
};

interface RunnerActivityProps {
  runner: Runner;
  connected: boolean;
  /** Shows only the diagnostic logs, as a full page without the Jobs view. */
  logsOnly?: boolean;
}

/**
 * Owns the state both views keep across tab switches. Both queries stay subscribed while their
 * view is hidden so returning to a tab shows its cached data instead of a loading state.
 */
export function RunnerActivity({ runner, connected, logsOnly = false }: RunnerActivityProps) {
  const [tab, setTab] = useState(() => initialRunnerActivityTab(runner, logsOnly));
  const { view, changeView } = useRunnerLogView();
  const logs = useRunnerLogs(runner.id, view.file, view.live, tab === 'logs');
  const { repository, draft, setDraft, submitDraft } = useRunnerJobRepository();
  const jobs = useRunnerJobs(runner.id, repository, !logsOnly && tab === 'jobs' && connected);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  let layout: RunnerActivityLayout = 'panel';
  if (logsOnly) layout = 'page';
  let jobsView = (
    <p>Connect GitHub above to view jobs. Local controls and logs are still available.</p>
  );
  if (connected) {
    jobsView = (
      <>
        {runner.target.kind === 'org' && (
          <RunnerJobRepositoryForm
            owner={runner.target.name}
            draft={draft}
            onDraftChange={setDraft}
            onSubmit={submitDraft}
          />
        )}
        <RunnerJobsResults
          data={jobs.data}
          error={jobs.error}
          retrying={jobs.isFetching}
          onRetry={() => void jobs.refetch()}
          runnerId={runner.id}
          fallbackRepository={repository || runner.target.name}
          selectedJobId={selectedJobId}
          onSelectJob={(id) => setSelectedJobId((current) => toggleSelectedJob(current, id))}
        />
      </>
    );
  }
  return (
    <section
      className={cn('text-xs', sectionClasses[layout])}
      aria-label={`Activity for ${runner.name}`}
    >
      <div
        className={cn(
          'mx-0 mb-3.5 flex min-h-7 shrink-0 items-center justify-start gap-3.5',
          'max-md:flex-wrap max-md:gap-2.5',
          headerClasses[layout],
        )}
      >
        <RunnerActivityIdentity
          layout={layout}
          tab={tab}
          title={runnerActivityTitle(tab, logsOnly)}
          runnerName={runner.name}
        />
        {!logsOnly && <RunnerActivityTabs tab={tab} onTabChange={setTab} />}
        {!!(tab === 'jobs' && connected) && (
          <RefreshButton
            className="min-h-6 border-0 bg-transparent p-0 text-xs text-accent shadow-none"
            label="Refresh jobs"
            disabled={jobs.isFetching}
            onClick={() => void jobs.refetch()}
          />
        )}
      </div>
      {tab === 'logs' && (
        <RunnerDiagnosticLogs
          layout={layout}
          snapshot={logs.data}
          error={logs.error}
          retrying={logs.isFetching}
          onRetry={() => void logs.refetch()}
          view={view}
          onViewChange={changeView}
        />
      )}
      {tab === 'jobs' && <div className="flex min-w-0 flex-1 flex-col">{jobsView}</div>}
    </section>
  );
}
