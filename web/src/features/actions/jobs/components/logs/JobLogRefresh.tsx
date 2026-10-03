import { cn } from '../../../../../shared/lib/cn';
import { RefreshButton } from '../../../../../shared/ui/controls/buttons/RefreshButton';
import { type useJobLogs } from '../../hooks/use-job-logs';
import { type ReplayLogs } from '../../types/replay-logs';

export function JobLogRefresh({
  replay,
  label,
  logs,
}: {
  replay?: ReplayLogs;
  label: string;
  logs: ReturnType<typeof useJobLogs>;
}) {
  if (replay) return <span>Recorded output</span>;
  return (
    <RefreshButton
      className={cn(
        'min-h-6 rounded-md border border-slate-700 bg-slate-800 py-0.75 text-xs',
        'text-slate-100 shadow-none',
      )}
      iconClassName="size-3.75 text-sky-300"
      label={`Refresh ${label.toLowerCase()}`}
      disabled={logs.isFetching}
      onClick={() => void logs.refetch()}
    />
  );
}
