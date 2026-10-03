import { LoadingPlaceholder } from '../../../../../shared/ui/loading/components/LoadingPlaceholder';
import type { RunnerActivityState } from '../../models/runner-activity';

export function RunnerDiagnosticOutput({ logs }: { logs: RunnerActivityState['logs'] }) {
  if (logs.isPending) return <LoadingPlaceholder kind="runner-logs" />;
  return logs.data?.content || 'No log output yet.';
}
