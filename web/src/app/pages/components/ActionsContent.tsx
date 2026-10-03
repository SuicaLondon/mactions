import { JobHistory } from '../../../features/actions/history/components/list/JobHistory';
import { RunDetail } from '../../../features/actions/runs/components/detail/RunDetail';
import { RunsView } from '../../../features/actions/runs/components/list/RunsView';
import { useNavigation } from '../../navigation/hooks/use-navigation';

export function ActionsContent() {
  const { page, preferences, updateRunSelection, openHistory, openRun, updateHistory } =
    useNavigation();
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
        status={page.status ?? 'all'}
        onStatusChange={(status) => updateHistory({ status })}
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
      status={preferences.runStatus}
      onOpenRun={openRun}
    />
  );
}
