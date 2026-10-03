import { LoadingPlaceholder } from '../../../../../shared/ui/loading/components/LoadingPlaceholder';
import type { RunnerActivityState } from '../../models/runner-activity';

interface RunnerJobsNoticeProps {
  jobs: RunnerActivityState['jobs'];
}

export function RunnerJobsNotice({ jobs }: RunnerJobsNoticeProps) {
  if (jobs.isPending) return <LoadingPlaceholder kind="graph" label="Loading runner jobs…" />;
  if (jobs.data?.needs_repository) {
    return (
      <p className="panel-empty m-0 grid flex-1 place-items-center p-5 text-muted">
        Choose a repository to view jobs.
      </p>
    );
  }
  return null;
}
