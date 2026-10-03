import { cn } from '../../../../../shared/lib/cn';
import { LoadingPlaceholder } from '../../../../../shared/ui/loading/components/LoadingPlaceholder';
import { type useJobLogs } from '../../hooks/use-job-logs';
import { JobLogLines } from './JobLogLines';

export function JobLogOutput({
  logs,
  fill,
  wrap,
  label,
}: {
  logs: ReturnType<typeof useJobLogs>;
  fill: boolean;
  wrap: boolean;
  label: string;
}) {
  if ((logs.isPending || logs.data?.state === 'pending') && !logs.error) {
    return (
      <LoadingPlaceholder kind="logs" className="min-h-0 flex-1 bg-slate-950 text-slate-300" />
    );
  }
  if (logs.data?.state !== 'available') {
    if (logs.error && !logs.data) return null;
    return (
      <p
        className={cn(
          'job-log-message m-0 px-4 py-3.5 text-xs leading-relaxed wrap-anywhere',
          'text-slate-300',
        )}
        role="status"
      >
        {logs.data?.message || 'Log output is not available yet.'}
      </p>
    );
  }
  return (
    <>
      {!!logs.data.message && (
        <p
          className={cn(
            'job-log-notice m-0 shrink-0 px-4 pt-3.5 text-xs leading-relaxed wrap-anywhere',
            'text-slate-300',
          )}
        >
          {logs.data.message}
        </p>
      )}
      <pre
        className={cn(
          'job-log-content m-0 max-h-140 overflow-auto bg-slate-950 px-0 py-3 font-mono',
          'text-xs leading-5 whitespace-pre tab-4 select-text',
          {
            'max-h-none min-h-0 flex-1': fill,
            'wrap-lines wrap-anywhere whitespace-pre-wrap': wrap,
          },
        )}
        tabIndex={0}
        aria-label={label}
      >
        <JobLogLines content={logs.data.content} />
      </pre>
    </>
  );
}
