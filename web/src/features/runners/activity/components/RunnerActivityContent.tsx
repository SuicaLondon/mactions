import type { Runner } from '../../../../shared/api/types';
import type { RunnerActivityState } from '../models/runner-activity';
import { RunnerJobsContent } from './jobs/RunnerJobsContent';
import { RunnerDiagnosticLogs } from './logs/RunnerDiagnosticLogs';

interface RunnerActivityContentProps {
  runner: Runner;
  connected: boolean;
  logsOnly: boolean;
  activity: RunnerActivityState;
}

export function RunnerActivityContent({
  runner,
  connected,
  logsOnly,
  activity,
}: RunnerActivityContentProps) {
  if (activity.tab === 'logs') {
    return <RunnerDiagnosticLogs logsOnly={logsOnly} activity={activity} />;
  }
  return (
    <div className="jobs-view flex min-w-0 flex-1 flex-col">
      <RunnerJobsContent runner={runner} connected={connected} activity={activity} />
    </div>
  );
}
