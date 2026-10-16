import { JobHistory } from '../../../features/actions/history/components/JobHistory';
import { RunDetail } from '../../../features/actions/runs/components/detail/RunDetail';
import { RunsView } from '../../../features/actions/runs/components/list/RunsView';
import { useCurrentPage } from '../../navigation/hooks/use-current-page';
import { useRunSelectionUpdate } from '../../navigation/hooks/use-run-selection-update';
import { useNavigationStore } from '../../navigation/stores/navigation-store';

export function ActionsContent() {
  const page = useCurrentPage();
  const preferences = useNavigationStore((state) => state.preferences);
  const openHistory = useNavigationStore((state) => state.openHistory);
  const openRun = useNavigationStore((state) => state.openRun);
  const updateHistory = useNavigationStore((state) => state.updateHistory);
  const updateRunSelection = useRunSelectionUpdate();
  if (page.type === 'run') {
    return (
      <RunDetail
        run={page.run}
        highlightRunnerId={page.runner?.githubId}
        selection={{ jobId: page.selectedJobId ?? null, stepNumber: page.selectedStepNumber }}
        onSelectionChange={updateRunSelection}
        onOpenHistory={openHistory}
      />
    );
  }
  if (page.type === 'history') {
    return (
      <JobHistory
        job={page.job}
        repository={page.repository}
        highlightRunnerId={page.runner?.githubId}
        onOpenRun={openRun}
        statusFilter={page.status ?? 'all'}
        onStatusFilterChange={(status) => updateHistory({ status })}
        expandedJobIds={page.expandedJobIds ?? []}
        onExpandedJobsChange={(expandedJobIds) => updateHistory({ expandedJobIds })}
      />
    );
  }
  let runnerId: number | undefined;
  let runnerName: string | undefined;
  if (page.type === 'runner') {
    runnerId = page.runner.githubId;
    runnerName = page.runner.name;
  }
  return (
    <RunsView
      scope={preferences.scope}
      runnerId={runnerId}
      runnerName={runnerName}
      search={preferences.runSearch}
      statusFilter={preferences.runStatus}
      onOpenRun={openRun}
    />
  );
}
